"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("@ulixee/commons/lib/Logger");
const localchain_1 = require("@ulixee/localchain");
const serdeJson_1 = require("@ulixee/platform-utils/lib/serdeJson");
const DatastoreEscrowsDb_1 = require("../db/DatastoreEscrowsDb");
const { log } = (0, Logger_1.default)(module);
class EscrowSpendTracker {
    constructor(escrowDbDir, localchain) {
        this.escrowDbDir = escrowDbDir;
        this.localchain = localchain;
        this.escrowDbsByDatastore = new Map();
        this.openEscrowsById = new Map();
    }
    async close() {
        return Promise.resolve();
    }
    async debit(data) {
        if (!data.payment.escrow.id) {
            throw new Error('The payment sent to the escrow spend tracker does not have an escrow id. This is an internal error.');
        }
        await this.updateSettlement(data.payment.escrow.id, data.payment.escrow.settledMilligons, data.payment.escrow.settledSignature);
        return this.getDb(data.datastoreId).debit(data.queryId, data.payment);
    }
    finalize(data) {
        const { datastoreId, escrowId, uuid, finalMicrogons } = data;
        this.getDb(datastoreId).finalize(escrowId, uuid, finalMicrogons);
        return Promise.resolve();
    }
    async importEscrow(data, datastoreManifest) {
        const note = data.escrow.escrowHoldNote;
        if (note.noteType.action === 'escrowHold') {
            if (datastoreManifest.domain) {
                const notaryHash = localchain_1.DataDomainStore.getHash(datastoreManifest.domain);
                if (!note.noteType.dataDomainHash.equals(notaryHash)) {
                    throw new Error(`The supplied Escrow note does not match the data domain of this Datastore ${data.datastoreId}`);
                }
            }
            if (datastoreManifest.payment.notaryId !== data.escrow.previousBalanceProof?.notaryId) {
                throw new Error(`The escrow notary (${data.escrow.previousBalanceProof?.notaryId}) does not match the required notary (${datastoreManifest.payment.notaryId})`);
            }
            const recipient = note.noteType.recipient;
            if (datastoreManifest.payment.address !== recipient) {
                throw new Error(`The datastore payment address (${data.escrow.accountId}) does not match the escrow hold recipient (${recipient})`);
            }
            if (!(await this.canSign(recipient))) {
                log.warn('This escrow is made out to a different address than your attached localchain', {
                    recipient,
                    escrow: data.escrow,
                });
                throw new Error('Escrow recipient not localchain address');
            }
        }
        else {
            throw new Error('Invalid escrow note');
        }
        const escrow = await this.importToLocalchain(data.datastoreId, data.escrow);
        this.getDb(data.datastoreId).create(escrow.id, Number(escrow.holdAmount), this.timeForTick(escrow.expirationTick));
        return { accepted: true };
    }
    async updateSettlement(escrowId, settledMilligons, settledSignature) {
        let escrow = this.openEscrowsById.get(escrowId);
        if (!escrow) {
            escrow = await this.localchain.openEscrows.get(escrowId);
            this.openEscrowsById.set(escrowId, escrow);
        }
        const internal = await escrow.escrow;
        if (settledMilligons > internal.settledAmount) {
            await escrow.recordUpdatedSettlement(settledMilligons, settledSignature);
        }
    }
    timeForTick(tick) {
        return this.localchain.timeForTick(tick);
    }
    async importToLocalchain(datastoreId, balanceChange) {
        log.stats('Importing escrow to localchain', { datastoreId, balanceChange });
        const escrowJson = (0, serdeJson_1.default)(balanceChange);
        const openEscrow = await this.localchain.openEscrows.importEscrow(escrowJson);
        const escrow = await openEscrow.escrow;
        this.openEscrowsById.set(escrow.id, openEscrow);
        return escrow;
    }
    async canSign(address) {
        return (await this.localchain.address) === address;
    }
    getDb(datastoreId) {
        if (!datastoreId)
            throw new Error('No datastoreId provided to get escrow spend tracking db.');
        let db = this.escrowDbsByDatastore.get(datastoreId);
        if (!db) {
            db = new DatastoreEscrowsDb_1.default(this.escrowDbDir, datastoreId);
            this.escrowDbsByDatastore.set(datastoreId, db);
        }
        return db;
    }
}
exports.default = EscrowSpendTracker;
//# sourceMappingURL=EscrowSpendTracker.js.map