/// <reference types="jest" />
import { Escrow } from '@ulixee/localchain';
import IBalanceChange from '@ulixee/platform-specification/types/IBalanceChange';
export default class MockEscrowSpendTracker {
    canSign: jest.SpyInstance<any, unknown[], any>;
    updateSettlement: jest.SpyInstance<any, unknown[], any>;
    importToLocalchain: jest.SpyInstance<any, unknown[], any>;
    timeForTick: jest.SpyInstance<any, unknown[], any>;
    clear(): void;
    mock(onImport: (datastoreId: string, escrow: IBalanceChange) => Pick<Escrow, 'id' | 'expirationTick' | 'holdAmount'>): void;
}
