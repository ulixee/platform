import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import { IVersionHistoryEntry } from '@ulixee/specification/types/IDatastoreManifest';

export default class DatastoreVersionsTable extends SqliteTable<IDatastoreVersionRecord> {
  private getQuery: Statement<string>;
  private findWithBaseHash: Statement<string>;
  private cacheByVersionHash: Record<string, IDatastoreVersionRecord> = {};
  private versionsByBaseHash: Record<string, IVersionHistoryEntry[]> = {};

  constructor(db: SqliteDatabase) {
    super(
      db,
      'DatastoreVersions',
      [
        ['versionHash', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['baseVersionHash', 'TEXT'],
        ['versionTimestamp', 'DATETIME'],
        ['lastUpdatedTimestamp', 'DATETIME'],
      ],
      true,
    );
    this.getQuery = db.prepare(`select * from ${this.tableName} where versionHash = ? limit 1`);
    this.findWithBaseHash = db.prepare(
      `select * from ${this.tableName} where baseVersionHash = ? order by versionTimestamp desc`,
    );
  }

  public save(versionHash: string, versionTimestamp: number, baseVersionHash: string): void {
    const now = Date.now();
    this.insertNow([versionHash, baseVersionHash, versionTimestamp, now]);
    this.cacheByVersionHash[versionHash] = {
      versionHash,
      baseVersionHash,
      versionTimestamp,
      lastUpdatedTimestamp: now,
    };
    this.versionsByBaseHash[baseVersionHash] ??= this.getPreviousVersions(baseVersionHash);
    if (!this.versionsByBaseHash[baseVersionHash].some(x => x.versionHash === versionHash)) {
      this.versionsByBaseHash[baseVersionHash].unshift({ versionHash, versionTimestamp });
      this.versionsByBaseHash[baseVersionHash].sort(
        (a, b) => b.versionTimestamp - a.versionTimestamp,
      );
    }
  }

  public getLatestVersion(versionHash: string): string {
    const baseHash = this.getBaseHash(versionHash) ?? versionHash;
    const versions = this.getPreviousVersions(baseHash);
    if (!versions.length) return versionHash;
    return versions[0]?.versionHash;
  }

  public getPreviousVersions(baseVersionHash: string): IVersionHistoryEntry[] {
    if (!this.versionsByBaseHash[baseVersionHash]) {
      const versionRecords: IDatastoreVersionRecord[] = this.findWithBaseHash.all(baseVersionHash);
      const seenVersions = new Set<string>();
      this.versionsByBaseHash[baseVersionHash] = versionRecords.map(x => {
        if (seenVersions.has(x.versionHash)) return null;
        seenVersions.add(x.versionHash);

        return {
          versionHash: x.versionHash,
          versionTimestamp: x.versionTimestamp,
        };
      }).filter(Boolean);

    }
    return this.versionsByBaseHash[baseVersionHash];
  }

  public getBaseHash(versionHash: string): string {
    return this.getByHash(versionHash)?.baseVersionHash;
  }

  private getByHash(versionHash: string): IDatastoreVersionRecord {
    this.cacheByVersionHash[versionHash] ??= this.getQuery.get(versionHash);
    return this.cacheByVersionHash[versionHash];
  }
}

export interface IDatastoreVersionRecord {
  versionHash: string;
  versionTimestamp: number;
  baseVersionHash: string;
  lastUpdatedTimestamp: number;
}
