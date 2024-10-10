"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForSynchedBalance = void 0;
async function waitForSynchedBalance(localchain, balance) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        await localchain.balanceSync.sync({});
        const overview = await localchain.accountOverview();
        if (overview.balance === balance)
            return;
        await new Promise(resolve => setTimeout(resolve, Number(localchain.ticker.millisToNextTick())));
    }
}
exports.waitForSynchedBalance = waitForSynchedBalance;
//# sourceMappingURL=localchainHelpers.js.map