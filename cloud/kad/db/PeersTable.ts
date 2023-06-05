import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import { Database as SqliteDatabase, Statement } from 'better-sqlite3';

export default class PeersTable extends SqliteTable<IPeerRecord> {
  private getQuery: Statement<string>;

  constructor(db: SqliteDatabase) {
    super(
      db as any,
      'QueryLog',
      [
        ['nodeId', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['apiHost', 'TEXT', 'NOT NULL'],
        ['kadHost', 'TEXT', 'NOT NULL'],
        ['lastSeenDate', 'DATETIME', 'NOT NULL'],
        ['isVerified', 'INTEGER', 'NOT NULL'],
        ['tags', 'TEXT'],
      ],
      true,
    );
    this.getQuery = db.prepare(`select * from ${this.tableName} where nodeId=?`);
  }

  public updateTag(nodeId: string, tagName: string, value: number): void {
    const entry = this.get(nodeId);
    entry.tags ??= {};
    if (value === undefined) delete entry.tags[tagName];
    else entry.tags[tagName] = value;
    this.db.prepare(`update ${this.tableName} set tags=$tags where nodeId=$nodeId`).run({
      tags: JSON.stringify(entry.tags),
      nodeId,
    });
  }

  public isVerified(nodeId: string, isVerified: boolean): void {
    this.db
      .prepare(`update ${this.tableName} set isVerified=$isVerified where nodeId=$nodeId`)
      .run({
        isVerified: isVerified === true ? 1 : 0,
        nodeId,
      });
  }

  public override all(): IPeerRecord[] {
    const records = super.all();
    return records.map(x => {
      x.lastSeenDate = new Date(x.lastSeenDate);
      x.tags = JSON.parse(x.tags as any);
      x.isVerified = Boolean(x.isVerified);
      return x;
    });
  }

  public get(nodeId: string): IPeerRecord {
    const record = this.getQuery.get(nodeId) as IPeerRecord;
    if (!record) return null;
    record.lastSeenDate = new Date(record.lastSeenDate);
    record.tags = JSON.parse(record.tags as any);
    record.isVerified = Boolean(record.isVerified);
    return record;
  }

  public record(record: IPeerRecord): void {
    this.insertObject({
      ...record,
      lastSeenDate: record.lastSeenDate.getTime(),
      tags: JSON.stringify(record.tags ?? '{}'),
      isVerified: record.isVerified === true ? 1 : 0,
    } as any);
  }
}

export interface IPeerRecord extends INodeInfo {
  lastSeenDate: Date;
  isVerified: boolean;
  tags: Record<string, number>;
}
