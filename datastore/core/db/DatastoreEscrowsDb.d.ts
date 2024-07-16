import { IPayment } from '@ulixee/platform-specification';
export default class DatastoreEscrowsDb {
    datastoreId: string;
    private db;
    private readonly insertStatement;
    private readonly getStatement;
    private readonly debitStatement;
    private readonly finalizeStatement;
    private readonly path;
    private readonly paymentIdByEscrowId;
    private interval;
    constructor(baseDir: string, datastoreId: string);
    create(id: string, allocatedMilligons: number, expirationDate: Date): IEscrowRecord;
    list(): IEscrowRecord[];
    get(id: string): IEscrowRecord;
    debit(queryId: string, payment: IPayment): {
        shouldFinalize: boolean;
    };
    finalize(escrowId: string, uuid: string, finalMicrogons: number): void;
    cleanup(cleanWithExpiredMillis?: number): void;
    close(): void;
}
export interface IEscrowRecord {
    id: string;
    allocated: number;
    remaining: number;
    expirationDate: Date;
}
