"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dirUtils_1 = require("@ulixee/commons/lib/dirUtils");
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
const fileUtils_1 = require("@ulixee/commons/lib/fileUtils");
const Logger_1 = require("@ulixee/commons/lib/Logger");
const Queue_1 = require("@ulixee/commons/lib/Queue");
const TypeSerializer_1 = require("@ulixee/commons/lib/TypeSerializer");
const utils_1 = require("@ulixee/commons/lib/utils");
const localchain_1 = require("@ulixee/localchain");
const ArgonUtils_1 = require("@ulixee/platform-utils/lib/ArgonUtils");
const nanoid_1 = require("nanoid");
const Path = require("node:path");
const DatastoreApiClients_1 = require("../lib/DatastoreApiClients");
const { log } = (0, Logger_1.default)(module);
class ArgonReserver extends eventUtils_1.TypedEventEmitter {
    constructor(escrowSource, escrowAllocationStrategy = {
        type: 'multiplier',
        queries: 100,
    }, apiClients) {
        super();
        this.escrowSource = escrowSource;
        this.escrowAllocationStrategy = escrowAllocationStrategy;
        this.paymentsByDatastoreId = {};
        this.paymentsPendingFinalization = {};
        this.openEscrowsById = {};
        this.reserveQueueByDatastoreId = {};
        this.escrowQueue = new Queue_1.default('ESCROW QUEUE', 1);
        this.needsSave = false;
        this.closeApiClients = false;
        this.storePath = Path.join(ArgonReserver.baseStorePath, `${escrowSource.sourceKey}.json`);
        this.saveInterval = setInterval(() => this.save(), 5e3).unref();
        this.datastoreLookup = escrowSource.datastoreLookup;
        if (!apiClients) {
            this.apiClients = new DatastoreApiClients_1.default();
            this.closeApiClients = true;
        }
        else {
            this.apiClients = apiClients;
        }
    }
    async close() {
        clearInterval(this.saveInterval);
        await this.save();
        if (this.closeApiClients) {
            await this.apiClients.close();
        }
    }
    async load() {
        if (this.loadPromise)
            return this.loadPromise;
        this.loadPromise = (async () => {
            const paymentsByDatastore = await (0, fileUtils_1.readFileAsJson)(this.storePath).catch(() => ({}));
            Object.assign(this.paymentsByDatastoreId, paymentsByDatastore);
        })();
    }
    async save() {
        if (!this.needsSave || !this.loadPromise)
            return;
        this.needsSave = false;
        await this.loadPromise;
        await this.writeToDisk().catch(error => {
            log.error("Error saving EscrowFundsTracker's payments", { error });
        });
    }
    getEscrowDetails(escrowId) {
        return this.openEscrowsById[escrowId];
    }
    async reserve(paymentInfo) {
        const microgons = paymentInfo.microgons ?? 0;
        if (!microgons || !paymentInfo.recipient)
            return null;
        let datastoreHost = paymentInfo.host;
        const datastoreId = paymentInfo.id;
        datastoreHost = (0, utils_1.toUrl)(datastoreHost).host;
        await this.load();
        this.reserveQueueByDatastoreId[datastoreId] ??= new Queue_1.default();
        this.paymentsByDatastoreId[datastoreId] ??= [];
        return await this.reserveQueueByDatastoreId[datastoreId].run(async () => {
            this.paymentsByDatastoreId[datastoreId] = this.paymentsByDatastoreId[datastoreId].filter(x => x.remaining > 0 && (!x.expirationDate || x.expirationDate > new Date()));
            for (const paymentOption of this.paymentsByDatastoreId[datastoreId]) {
                if (paymentOption.remaining >= microgons) {
                    if (paymentOption.paymentMethod.escrow?.id) {
                        if (paymentOption.host !== datastoreHost)
                            continue;
                    }
                    return await this.charge(paymentOption, microgons);
                }
            }
            const milligons = this.calculateEscrowMilligons(datastoreId, microgons);
            const details = await this.createEscrow(paymentInfo, milligons);
            return await this.charge(details, microgons);
        });
    }
    async finalize(paymentInfo) {
        const { microgons, finalMicrogons, uuid } = paymentInfo;
        const payment = this.paymentsPendingFinalization[uuid];
        if (payment) {
            delete this.paymentsPendingFinalization[uuid];
            const details = this.paymentsByDatastoreId[payment.datastoreId].find(x => x.paymentMethod.credits?.id === payment.paymentId ||
                x.paymentMethod.escrow?.id === payment.paymentId);
            details.remaining += microgons - finalMicrogons;
            this.needsSave = true;
            this.emit('finalized', {
                paymentUuid: uuid,
                initialMicrogons: microgons,
                finalMicrogons,
                remainingBalance: details.remaining,
            });
        }
    }
    async createEscrow(paymentInfo, milligons) {
        const { id, host, version } = paymentInfo;
        if (milligons < localchain_1.ESCROW_MINIMUM_SETTLEMENT) {
            milligons = localchain_1.ESCROW_MINIMUM_SETTLEMENT;
        }
        return await this.escrowQueue.run(async () => {
            const escrow = await this.escrowSource.createEscrow(paymentInfo, milligons);
            const apiClient = this.apiClients.get(host);
            await apiClient.registerEscrow(id, escrow.balanceChange);
            const holdAmount = escrow.balanceChange.escrowHoldNote.milligons;
            const settlement = escrow.balanceChange.notes[0];
            if (settlement.noteType.action !== 'escrowSettle') {
                throw new Error('Invalid escrow balance change');
            }
            const escrowId = escrow.escrowId;
            const allocated = Number(holdAmount) * 1000;
            const entry = {
                paymentMethod: {
                    escrow: {
                        id: escrowId,
                        settledSignature: Buffer.from(escrow.balanceChange.signature),
                        settledMilligons: settlement.milligons,
                    },
                },
                id,
                version,
                remaining: allocated,
                expirationDate: escrow.expirationDate,
                host,
                allocated,
            };
            this.emit('createdEscrow', {
                escrowId,
                datastoreId: id,
                allocatedMilligons: holdAmount,
            });
            this.openEscrowsById[escrowId] = escrow;
            this.paymentsByDatastoreId[id] ??= [];
            this.paymentsByDatastoreId[id].push(entry);
            return entry;
        });
    }
    calculateEscrowMilligons(_datastoreId, microgons) {
        if (this.escrowAllocationStrategy.type === 'default') {
            return this.escrowAllocationStrategy.milligons;
        }
        if (this.escrowAllocationStrategy.type === 'multiplier') {
            return ArgonUtils_1.default.microgonsToMilligons(microgons * this.escrowAllocationStrategy.queries);
        }
        throw new Error('Unknown escrow allocation strategy. Please specify in `config.escrowAllocationStrategy.type`.');
    }
    async charge(details, microgons) {
        if (details.paymentMethod.escrow?.id) {
            await this.updateSettlement(details, microgons);
        }
        details.remaining -= microgons;
        this.needsSave = true;
        const payment = {
            uuid: (0, nanoid_1.nanoid)(),
            microgons,
            ...details.paymentMethod,
        };
        this.paymentsPendingFinalization[payment.uuid] = {
            microgons,
            datastoreId: details.id,
            paymentId: details.paymentMethod.credits?.id ?? details.paymentMethod.escrow?.id,
        };
        this.emit('reserved', {
            payment,
            datastoreId: details.id,
            remainingBalance: details.remaining,
        });
        return payment;
    }
    async updateSettlement(details, addedMicrogons) {
        const escrow = details.paymentMethod.escrow;
        if (!escrow)
            return;
        const updatedSettlement = BigInt(Math.ceil((details.allocated - details.remaining + addedMicrogons) / 1000));
        if (Number(updatedSettlement) * 1000 > details.allocated) {
            throw new Error('Cannot release more than the allocated amount');
        }
        if (updatedSettlement > escrow.settledMilligons) {
            const openEscrow = this.openEscrowsById[escrow.id];
            if (!openEscrow)
                throw new Error('Escrow not found');
            const result = await this.escrowSource.updateEscrowSettlement(openEscrow, updatedSettlement);
            escrow.settledMilligons = result.notes[0].milligons;
            escrow.settledSignature = result.signature;
            this.needsSave = true;
            this.emit('updateSettlement', {
                escrowId: escrow.id,
                settledMilligons: escrow.settledMilligons,
                datastoreId: details.id,
                remaining: BigInt(details.allocated / 1000) - escrow.settledMilligons,
            });
        }
    }
    async writeToDisk() {
        await (0, fileUtils_1.safeOverwriteFile)(this.storePath, TypeSerializer_1.default.stringify(this.paymentsByDatastoreId, { format: true }));
    }
}
ArgonReserver.baseStorePath = Path.join((0, dirUtils_1.getDataDirectory)(), `ulixee`);
exports.default = ArgonReserver;
//# sourceMappingURL=ArgonReserver.js.map