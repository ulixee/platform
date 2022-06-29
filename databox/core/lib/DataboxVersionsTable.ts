import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';

export default class DataboxVersionsTable extends SqliteTable<IDataboxVersionRecord> {
  private getQuery: Statement<string>;
  private findWithLatest: Statement<string>;
  private cache: Record<
    string,
    Pick<IDataboxVersionRecord, 'latestVersionScriptHash' | 'versionCreatedTimestamp'>
  > = {};

  constructor(db: SqliteDatabase) {
    super(
      db,
      'DataboxVersions',
      [
        ['scriptHash', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['latestVersionScriptHash', 'TEXT'],
        ['versionCreatedTimestamp', 'DATETIME'],
        ['lastUpdatedTimestamp', 'DATETIME'],
      ],
      true,
    );
    this.getQuery = db.prepare(`select * from ${this.tableName} where scriptHash = ? limit 1`);
    this.findWithLatest = db.prepare(
      `select * from ${this.tableName} where latestVersionScriptHash = ?`,
    );
  }

  public save(
    scriptHash: string,
    versionCreatedTimestamp: number,
    latestVersionScriptHash: string,
  ): void {
    this.insertNow([scriptHash, latestVersionScriptHash, versionCreatedTimestamp, Date.now()]);
    this.cache[scriptHash] = { latestVersionScriptHash, versionCreatedTimestamp };
  }

  public getLatestVersion(scriptHash: string): string {
    return this.getByHash(scriptHash)?.latestVersionScriptHash;
  }

  public getPreviousVersions(versionHashes: string[]): IVersionHashToCreatedTimestamp {
    const versions: IVersionHashToCreatedTimestamp = {};
    const checkedLatestVersions = new Set<string>();
    for (const version of versionHashes) {
      const storedVersion = this.getByHash(version);
      if (storedVersion) {
        versions[version] = storedVersion.versionCreatedTimestamp;
        const latestVersion = storedVersion.latestVersionScriptHash;

        if (!checkedLatestVersions.has(latestVersion)) {
          checkedLatestVersions.add(latestVersion);

          const history: IDataboxVersionRecord[] = this.findWithLatest.all(latestVersion);

          for (const entry of history) {
            versions[entry.scriptHash] = entry.versionCreatedTimestamp;
          }
        }
      }
    }
    return versions;
  }

  private getByHash(
    scriptHash: string,
  ): Pick<IDataboxVersionRecord, 'latestVersionScriptHash' | 'versionCreatedTimestamp'> {
    return (this.cache[scriptHash] ??= this.getQuery.get(scriptHash));
  }
}

export interface IVersionHashToCreatedTimestamp {
  [scriptHash: string]: number;
}

export interface IDataboxVersionRecord {
  scriptHash: string;
  versionCreatedTimestamp: number;
  latestVersionScriptHash: string;
  lastUpdatedTimestamp: number;
}
