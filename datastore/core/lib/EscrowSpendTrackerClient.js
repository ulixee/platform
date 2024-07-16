"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EscrowSpendTrackerClient {
    constructor(serviceClient) {
        this.serviceClient = serviceClient;
    }
    async debit(data) {
        return this.serviceClient.sendRequest({
            command: 'EscrowService.debitPayment',
            args: [data],
        });
    }
    finalize(data) {
        return this.serviceClient.sendRequest({
            command: 'EscrowService.finalizePayment',
            args: [data],
        });
    }
    async importEscrow(data, _datastoreManifest) {
        return this.serviceClient.sendRequest({
            command: 'EscrowService.importEscrow',
            args: [data],
        });
    }
}
exports.default = EscrowSpendTrackerClient;
//# sourceMappingURL=EscrowSpendTrackerClient.js.map