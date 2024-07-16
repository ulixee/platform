"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IBalanceChange_1 = require("@ulixee/platform-specification/types/IBalanceChange");
class LocalchainEscrowSource {
    get sourceKey() {
        return `localchain-${this.address}`;
    }
    constructor(localchain, address) {
        this.localchain = localchain;
        this.address = address;
        this.openEscrowsById = {};
    }
    async getAccountOverview() {
        return await this.localchain.getAccountOverview();
    }
    async createEscrow(paymentInfo, milligons) {
        const { domain } = paymentInfo;
        const openEscrow = await this.localchain.inner.transactions.createEscrow(milligons, paymentInfo.recipient.address, domain, paymentInfo.recipient.notaryId);
        const balanceChange = await IBalanceChange_1.BalanceChangeSchema.parseAsync(JSON.parse(await openEscrow.exportForSend()));
        const escrow = await openEscrow.escrow;
        const escrowId = escrow.id;
        const expirationMillis = this.localchain.timeForTick(escrow.expirationTick);
        this.openEscrowsById[escrowId] = openEscrow;
        return {
            escrowId,
            balanceChange,
            expirationDate: new Date(Number(expirationMillis)),
        };
    }
    async updateEscrowSettlement(escrow, updatedSettlement) {
        const escrowId = escrow.escrowId;
        this.openEscrowsById[escrowId] ??= await this.localchain.openEscrows.get(escrowId);
        const openEscrow = this.openEscrowsById[escrowId];
        const result = await openEscrow.sign(updatedSettlement);
        const balanceChange = escrow.balanceChange;
        balanceChange.signature = Buffer.from(result.signature);
        balanceChange.notes[0].milligons = result.milligons;
        balanceChange.balance = balanceChange.escrowHoldNote.milligons - result.milligons;
        return balanceChange;
    }
}
exports.default = LocalchainEscrowSource;
//# sourceMappingURL=LocalchainEscrowSource.js.map