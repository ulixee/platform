"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bufferUtils_1 = require("@ulixee/commons/lib/bufferUtils");
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
const hashUtils_1 = require("@ulixee/commons/lib/hashUtils");
const IBalanceChange_1 = require("@ulixee/platform-specification/types/IBalanceChange");
const nanoid_1 = require("nanoid");
class MockPaymentService extends eventUtils_1.TypedEventEmitter {
    constructor(clientAddress, client) {
        super();
        this.clientAddress = clientAddress;
        this.client = client;
        this.paymentsByDatastoreId = {};
        this.escrowsById = {};
        this.payments = [];
    }
    async close() {
        return null;
    }
    async reserve(info) {
        const paymentId = (0, nanoid_1.nanoid)();
        let escrowId = this.paymentsByDatastoreId[info.id]?.escrowId;
        if (!escrowId) {
            escrowId = (0, bufferUtils_1.encodeBuffer)((0, hashUtils_1.sha256)((0, nanoid_1.nanoid)()), 'esc');
            this.paymentsByDatastoreId[info.id] = {
                escrowId,
            };
            const milligons = BigInt(Math.min(5, Math.ceil((info.microgons * 100) / 1000)));
            this.escrowsById[escrowId] = { escrowHoldAmount: milligons, tick: 1 };
            await this.client.registerEscrow(info.id, {
                accountId: this.clientAddress.address,
                accountType: IBalanceChange_1.AccountType.Deposit,
                balance: 20000n - milligons,
                previousBalanceProof: {
                    balance: 20000n,
                    notaryId: info.recipient.notaryId,
                    accountOrigin: { notebookNumber: 1, accountUid: 1 },
                    notebookNumber: 1,
                    notebookProof: {
                        leafIndex: 0,
                        numberOfLeaves: 1,
                        proof: [],
                    },
                    tick: 1,
                },
                escrowHoldNote: {
                    noteType: { action: 'escrowHold', recipient: info.recipient.address },
                    milligons,
                },
                notes: [{ milligons: 5n, noteType: { action: 'escrowSettle' } }],
                changeNumber: 2,
                signature: Buffer.from(this.clientAddress.sign('siggy', { withType: true })),
            });
        }
        return {
            escrow: {
                id: escrowId,
                settledMilligons: 5n,
                settledSignature: Buffer.from(this.clientAddress.sign('siggy', { withType: true })),
            },
            microgons: info.microgons,
            uuid: paymentId,
        };
    }
    async finalize(info) {
        this.payments.push(info);
    }
}
exports.default = MockPaymentService;
//# sourceMappingURL=_MockPaymentService.js.map