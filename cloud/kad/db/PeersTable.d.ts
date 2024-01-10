import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import { Database as SqliteDatabase } from 'better-sqlite3';
export default class PeersTable extends SqliteTable<IPeerRecord> {
    private getQuery;
    constructor(db: SqliteDatabase);
    updateTag(nodeId: string, tagName: string, value: number): void;
    isVerified(nodeId: string, isVerified: boolean): void;
    all(): IPeerRecord[];
    get(nodeId: string): IPeerRecord;
    record(record: IPeerRecord): void;
}
export interface IPeerRecord extends INodeInfo {
    lastSeenDate: Date;
    isVerified: boolean;
    tags: Record<string, number>;
}
