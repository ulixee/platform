"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const localchain_1 = require("@argonprotocol/localchain");
const dirUtils_1 = require("@ulixee/commons/lib/dirUtils");
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
const fileUtils_1 = require("@ulixee/commons/lib/fileUtils");
const Logger_1 = require("@ulixee/commons/lib/Logger");
const Queue_1 = require("@ulixee/commons/lib/Queue");
const TypeSerializer_1 = require("@ulixee/commons/lib/TypeSerializer");
const utils_1 = require("@ulixee/commons/lib/utils");
const ArgonUtils_1 = require("@ulixee/platform-utils/lib/ArgonUtils");
const nanoid_1 = require("nanoid");
const Path = require("node:path");
const DatastoreApiClients_1 = require("../lib/DatastoreApiClients");
const { log } = (0, Logger_1.default)(module);
class ArgonReserver extends eventUtils_1.TypedEventEmitter {
    constructor(channelHoldSource, channelHoldAllocationStrategy = {
        type: 'multiplier',
        queries: 100,
    }, apiClients) {
        super();
        this.channelHoldSource = channelHoldSource;
        this.channelHoldAllocationStrategy = channelHoldAllocationStrategy;
        this.paymentsByDatastoreId = {};
        this.paymentsPendingFinalization = {};
        this.reserveQueueByDatastoreId = {};
        this.channelHoldQueue = new Queue_1.default('CHANNELHOLD QUEUE', 1);
        this.needsSave = false;
        this.closeApiClients = false;
        this.storePath = Path.join(ArgonReserver.baseStorePath, `${channelHoldSource.sourceKey}.json`);
        this.saveInterval = setInterval(() => this.save(), 5e3).unref();
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
            log.error("Error saving ChannelHoldFundsTracker's payments", { error });
        });
    }
    async reserve(paymentInfo) {
        const microgons = paymentInfo.microgons ?? 0;
        if (!microgons || !paymentInfo.recipient)
            return null;
        let datastoreHost = paymentInfo.host;
        const datastoreId = paymentInfo.id;
        datastoreHost = (0, utils_1.toUrl)(datastoreHost).host;
        await this.load();
        this.reserveQueueByDatastoreId[datastoreId] ??= new Queue_1.default('RESERVE QUEUE', 1);
        this.paymentsByDatastoreId[datastoreId] ??= [];
        return await this.reserveQueueByDatastoreId[datastoreId].run(async () => {
            this.paymentsByDatastoreId[datastoreId] = this.paymentsByDatastoreId[datastoreId].filter(x => x.remaining > 0 && (!x.expirationDate || x.expirationDate > new Date()));
            for (const paymentOption of this.paymentsByDatastoreId[datastoreId]) {
                if (paymentOption.remaining >= microgons) {
                    if (paymentOption.paymentMethod.channelHold?.id) {
                        if (paymentOption.host !== datastoreHost &&
                            !paymentOption.host.includes(`//${datastoreHost}`))
                            continue;
                    }
                    return await this.charge(paymentOption, microgons);
                }
            }
            const milligons = this.calculateChannelHoldMilligons(datastoreId, microgons);
            const details = await this.createChannelHold(paymentInfo, milligons);
            return await this.charge(details, microgons);
        });
    }
    async finalize(paymentInfo) {
        const { microgons, finalMicrogons, uuid } = paymentInfo;
        const payment = this.paymentsPendingFinalization[uuid];
        if (payment) {
            delete this.paymentsPendingFinalization[uuid];
            const details = this.paymentsByDatastoreId[payment.datastoreId].find(x => x.paymentMethod.credits?.id === payment.paymentId ||
                x.paymentMethod.channelHold?.id === payment.paymentId);
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
    async createChannelHold(paymentInfo, milligons) {
        const { id, host, version } = paymentInfo;
        if (milligons < localchain_1.CHANNEL_HOLD_MINIMUM_SETTLEMENT) {
            milligons = localchain_1.CHANNEL_HOLD_MINIMUM_SETTLEMENT;
        }
        return await this.channelHoldQueue.run(async () => {
            const channelHold = await this.channelHoldSource.createChannelHold(paymentInfo, milligons);
            const apiClient = this.apiClients.get(host);
            await apiClient.registerChannelHold(id, channelHold.balanceChange);
            const holdAmount = channelHold.balanceChange.channelHoldNote.milligons;
            const settlement = channelHold.balanceChange.notes[0];
            if (settlement.noteType.action !== 'channelHoldSettle') {
                throw new Error('Invalid channelHold balance change');
            }
            const channelHoldId = channelHold.channelHoldId;
            const allocated = Number(holdAmount) * 1000;
            const entry = {
                paymentMethod: {
                    channelHold: {
                        id: channelHoldId,
                        settledSignature: Buffer.from(channelHold.balanceChange.signature),
                        settledMilligons: settlement.milligons,
                    },
                },
                id,
                version,
                remaining: allocated,
                expirationDate: channelHold.expirationDate,
                host,
                allocated,
            };
            this.emit('createdChannelHold', {
                channelHoldId,
                datastoreId: id,
                allocatedMilligons: holdAmount,
            });
            this.paymentsByDatastoreId[id] ??= [];
            this.paymentsByDatastoreId[id].push(entry);
            return entry;
        });
    }
    calculateChannelHoldMilligons(_datastoreId, microgons) {
        if (this.channelHoldAllocationStrategy.type === 'default') {
            return this.channelHoldAllocationStrategy.milligons;
        }
        if (this.channelHoldAllocationStrategy.type === 'multiplier') {
            return ArgonUtils_1.default.microgonsToMilligons(microgons * this.channelHoldAllocationStrategy.queries);
        }
        throw new Error('Unknown channelHold allocation strategy. Please specify in `config.channelHoldAllocationStrategy.type`.');
    }
    async charge(details, microgons) {
        if (details.paymentMethod.channelHold?.id) {
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
            paymentId: details.paymentMethod.credits?.id ?? details.paymentMethod.channelHold?.id,
        };
        this.emit('reserved', {
            payment,
            datastoreId: details.id,
            remainingBalance: details.remaining,
        });
        return payment;
    }
    async updateSettlement(details, addedMicrogons) {
        const channelHold = details.paymentMethod.channelHold;
        if (!channelHold)
            return;
        const updatedSettlement = BigInt(Math.ceil((details.allocated - details.remaining + addedMicrogons) / 1000));
        if (Number(updatedSettlement) * 1000 > details.allocated) {
            throw new Error('Cannot release more than the allocated amount');
        }
        if (updatedSettlement > channelHold.settledMilligons) {
            await this.channelHoldSource.updateChannelHoldSettlement(channelHold, updatedSettlement);
            this.needsSave = true;
            this.emit('updateSettlement', {
                channelHoldId: channelHold.id,
                settledMilligons: channelHold.settledMilligons,
                datastoreId: details.id,
                remaining: BigInt(details.allocated / 1000) - channelHold.settledMilligons,
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