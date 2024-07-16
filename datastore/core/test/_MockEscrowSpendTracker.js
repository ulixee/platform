"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EscrowSpendTracker_1 = require("../lib/EscrowSpendTracker");
class MockEscrowSpendTracker {
    constructor() {
        this.canSign = jest.spyOn(EscrowSpendTracker_1.default.prototype, 'canSign');
        this.updateSettlement = jest.spyOn(EscrowSpendTracker_1.default.prototype, 'updateSettlement');
        this.importToLocalchain = jest.spyOn(EscrowSpendTracker_1.default.prototype, 'importToLocalchain');
        this.timeForTick = jest.spyOn(EscrowSpendTracker_1.default.prototype, 'timeForTick');
    }
    clear() {
        this.canSign.mockClear();
        this.importToLocalchain.mockClear();
        this.updateSettlement.mockClear();
        this.timeForTick.mockClear();
    }
    mock(onImport) {
        this.canSign.mockReturnValue(Promise.resolve(true));
        this.updateSettlement.mockResolvedValue(undefined);
        this.importToLocalchain.mockImplementation((datastoreId, escrow) => {
            return onImport(datastoreId, escrow);
        });
        this.timeForTick.mockImplementation((tick) => {
            const expiration = Date.now() + tick * 2000;
            return new Date(expiration);
        });
    }
}
exports.default = MockEscrowSpendTracker;
//# sourceMappingURL=_MockEscrowSpendTracker.js.map