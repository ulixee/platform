import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import { Database as SqliteDatabase, Statement } from 'better-sqlite3';

export default class DatastoreVersionsTable extends SqliteTable<IDatastoreVersionRecord> {
  private getQuery: Statement<[string, string]>;
  private latestByDatastoresQuery: Statement<[limit: number, offset: number]>;
  private countDatastoresQuery: Statement<[]>;
  private findByIdQuery: Statement<string>;
  private updateLatestQuery: Statement<[id: string, latestVersion: string]>;
  private versionsById: Record<string, IVersionHistoryEntry[]> = {};
  private cacheByVersion: { [id_version: string]: IDatastoreVersionRecord } = {};

  constructor(db: SqliteDatabase) {
    super(
      db,
      'DatastoreVersions',
      [
        ['id', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['version', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['dbxPath', 'TEXT', 'NOT NULL'],
        ['versionTimestamp', 'DATETIME'],
        ['scriptEntrypoint', 'TEXT'],
        ['source', 'TEXT'],
        ['adminIdentity', 'TEXT'],
        ['adminSignature', 'BLOB'],
        ['publishedToNetworkTimestamp', 'DATETIME'],
        ['isLatest', 'INTEGER'],
        ['isStarted', 'INTEGER'],
      ],
      true,
    );
    this.getQuery = db.prepare(
      `select * from ${this.tableName} where id = ? and version = ? limit 1`,
    );
    this.latestByDatastoresQuery = db.prepare(
      `select * from ${this.tableName} where isLatest=1 order by id desc limit ? offset ?`,
    );
    this.countDatastoresQuery = db.prepare(
      `select count(1) from ${this.tableName} where isLatest=1`,
    );
    this.findByIdQuery = db.prepare(`select * from ${this.tableName} where id = ?`);
    this.updateLatestQuery = db.prepare(
      `update ${this.tableName} set isLatest=0 where id = ? and version != ?`,
    );
  }

  public list(
    results = 100,
    offset = 0,
  ): {
    datastores: IDatastoreVersionRecord[];
    total: number;
  } {
    const all = this.latestByDatastoresQuery.all(
      results,
      offset,
    ) as unknown as (IDatastoreVersionRecord & { versions: IVersionHistoryEntry[] })[];
    for (const entry of all) {
      entry.versions = this.getDatastoreVersions(entry.id);
    }
    const total = this.countDatastoresQuery.pluck().get() as number;
    return { datastores: all, total };
  }

  public allCached(): IDatastoreVersionRecord[] {
    return Object.values(this.cacheByVersion);
  }

  public setDbxStopped(dbxPath: string): IDatastoreVersionRecord {
    for (const cached of this.allCached()) {
      if (cached.dbxPath === dbxPath) {
        this.db
          .prepare(`update ${this.tableName} set isStarted=0 where id=? and version=?`)
          .run(cached.id, cached.version);
        cached.isStarted = false;
        return cached;
      }
    }
  }

  public setDbxStarted(id: string, version: string): IDatastoreVersionRecord {
    this.db
      .prepare(`update ${this.tableName} set isStarted=1 where id=? and version=?`)
      .run(id, version);
    if (this.cacheByVersion[`${id}_${version}`])
      this.cacheByVersion[`${id}_${version}`].isStarted = true;
    return this.get(id, version);
  }

  public delete(id: string, version: string): IDatastoreVersionRecord {
    const record = this.get(id, version);
    this.db
      .prepare(`delete from ${this.tableName} where id=$id and version=$version`)
      .run({ id, version });
    delete this.cacheByVersion[`${id}_${version}`];
    return record;
  }

  public recordPublishedToNetworkDate(
    id: string,
    version: string,
    publishedToNetworkTimestamp: number,
  ): void {
    this.db
      .prepare(
        `update ${this.tableName} set publishedToNetworkTimestamp=$publishedToNetworkTimestamp where id=$id and version=$version`,
      )
      .run({ id, version, publishedToNetworkTimestamp });
    const cached = this.cacheByVersion[`${id}_${version}`];
    if (cached) {
      cached.publishedToNetworkTimestamp = publishedToNetworkTimestamp;
    }
  }

  public save(
    id: string,
    version: string,
    scriptEntrypoint: string,
    versionTimestamp: number,
    dbxPath: string,
    source: IDatastoreVersionRecord['source'],
    adminIdentity: string,
    adminSignature: Buffer,
    publishedToNetworkTimestamp?: number,
  ): void {
    const isStarted = true;

    const latestStored = this.getLatestVersion(id);
    let isLatest = true;
    if (
      latestStored &&
      latestStored.localeCompare(version, undefined, { numeric: true, sensitivity: 'base' }) < 0
    ) {
      isLatest = false;
    }
    this.insertNow([
      id,
      version,
      dbxPath,
      versionTimestamp,
      scriptEntrypoint,
      source,
      adminIdentity,
      adminSignature,
      publishedToNetworkTimestamp,
      isStarted ? 1 : 0,
      isLatest ? 1 : 0,
    ]);
    this.cacheByVersion[`${id}_${version}`] = {
      version,
      id,
      dbxPath,
      versionTimestamp,
      scriptEntrypoint,
      isStarted,
      isLatest,
      source,
      adminIdentity,
      adminSignature,
      publishedToNetworkTimestamp,
    };
    if (isLatest) this.updateLatestQuery.run(id, version);
    this.updateDatastoreVersionCache(id, version, versionTimestamp);
  }

  public get(id: string, version: string): IDatastoreVersionRecord {
    if (!this.cacheByVersion[`${id}_${version}`]) {
      const entry = this.getQuery.get(id, version) as IDatastoreVersionRecord;
      if (entry) {
        entry.isStarted = !!entry.isStarted;
        this.cacheByVersion[`${id}_${version}`] = entry;
      }
    }

    return this.cacheByVersion[`${id}_${version}`];
  }

  public getLatestVersion(id: string): string {
    const versions = this.getDatastoreVersions(id);
    return versions[0]?.version;
  }

  public getDatastoreVersions(id: string): IVersionHistoryEntry[] {
    if (!this.versionsById[id]) {
      this.versionsById[id] = [];
      const records = this.versionsById[id];

      const versionRecords = this.findByIdQuery.all(id) as IDatastoreVersionRecord[];
      const seenVersions = new Set<string>();
      for (const record of versionRecords) {
        if (seenVersions.has(record.version)) continue;
        seenVersions.add(record.version);

        records.push({
          version: record.version,
          timestamp: record.versionTimestamp,
        });
      }
      this.sortVersionCache(id);
    }
    return this.versionsById[id];
  }

  private updateDatastoreVersionCache(id: string, version: string, timestamp: number): void {
    this.versionsById[id] ??= this.getDatastoreVersions(id);
    if (!this.versionsById[id].some(x => x.version === version)) {
      this.versionsById[id].unshift({ version, timestamp });
      this.sortVersionCache(id);
    }
  }

  private sortVersionCache(id: string): void {
    this.versionsById[id].sort((a, b) =>
      b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: 'base' }),
    );
  }
}

export interface IVersionHistoryEntry {
  version: string;
  timestamp: number;
}

export interface IDatastoreVersionRecord {
  id: string;
  version: string;
  versionTimestamp: number;
  scriptEntrypoint: string;
  dbxPath: string;
  publishedToNetworkTimestamp: number;
  source: 'disk' | 'start' | 'upload' | 'upload:create-storage' | 'cluster';
  adminIdentity: string | undefined;
  adminSignature: Buffer | undefined;
  isStarted: boolean;
  isLatest: boolean;
}
