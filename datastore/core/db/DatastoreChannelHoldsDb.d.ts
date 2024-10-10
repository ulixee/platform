import { IPayment } from '@ulixee/platform-specification';
export default class DatastoreChannelHoldsDb {
    datastoreId: string;
    private db;
    private readonly insertStatement;
    private readonly getStatement;
    private readonly debitStatement;
    private readonly finalizeStatement;
    private readonly path;
    private readonly paymentIdByChannelHoldId;
    private interval;
    constructor(baseDir: string, datastoreId: string);
    create(id: string, allocatedMilligons: number, expirationDate: Date): IChannelHoldRecord;
    list(): IChannelHoldRecord[];
    get(id: string): IChannelHoldRecord;
    debit(queryId: string, payment: IPayment): {
        shouldFinalize: boolean;
    };
    finalize(channelHoldId: string, uuid: string, finalMicrogons: number): void;
    cleanup(cleanWithExpiredMillis?: number): void;
    close(): void;
}
export interface IChannelHoldRecord {
    id: string;
    allocated: number;
    remaining: number;
    expirationDate: Date;
}
