import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import { IVersionHistoryEntry } from '@ulixee/platform-specification/types/IDatastoreManifest';
import { Database as SqliteDatabase, Statement } from 'better-sqlite3';

export default class DatastoreVersionsTable extends SqliteTable<IDatastoreVersionRecord> {
  private getQuery: Statement<string>;
  private getByNetworkKeyQuery: Statement<Buffer>;
  private allQuery: Statement<[limit: number, offset: number]>;
  private findWithBaseHashQuery: Statement<string>;
  private findWithDomainQuery: Statement<string>;
  private findByEntrypointAndAdminQuery: Statement<[entrypoint: string, adminIdentity: string]>;
  private findByEntrypointQuery: Statement<string>;
  private versionsByBaseHash: Record<string, IVersionHistoryEntry[]> = {};
  private cacheByVersionHash: Record<string, IDatastoreVersionRecord> = {};

  constructor(db: SqliteDatabase) {
    super(
      db,
      'DatastoreVersions',
      [
        ['versionHash', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['baseVersionHash', 'TEXT'],
        ['dbxPath', 'TEXT'],
        ['versionTimestamp', 'DATETIME'],
        ['scriptEntrypoint', 'TEXT'],
        ['domain', 'TEXT'],
        ['source', 'TEXT'],
        ['sourceHost', 'TEXT'],
        ['installAllowedNewLinkedVersionHistory', 'INTEGER'],
        ['adminIdentity', 'TEXT'],
        ['adminSignature', 'BLOB'],
        ['expiresTimestamp', 'DATETIME'],
        ['networkKeyHash', 'BLOB'],
        ['publishedToNetworkTimestamp', 'DATETIME'],
        ['isStarted', 'INTEGER'],
      ],
      true,
    );
    this.getQuery = db.prepare(`select * from ${this.tableName} where versionHash = ? limit 1`);
    this.getByNetworkKeyQuery = db.prepare(
      `select * from ${this.tableName} where networkKeyHash = ?`,
    );
    this.allQuery = db.prepare(
      `select * from ${this.tableName} where dbxPath IS NOT NULL limit ? offset ?`,
    );
    this.findWithBaseHashQuery = db.prepare(
      `select * from ${this.tableName} where baseVersionHash = ? order by versionTimestamp desc`,
    );
    this.findWithDomainQuery = db.prepare(
      `select versionHash from ${this.tableName} where domain = ? order by versionTimestamp desc limit 1`,
    );
    this.findByEntrypointQuery = db.prepare(
      `select * from ${this.tableName} where scriptEntrypoint = ? and adminIdentity is NULL limit 1`,
    );
    this.findByEntrypointAndAdminQuery = db.prepare(
      `select * from ${this.tableName} where scriptEntrypoint = ? and adminIdentity = ? limit 1`,
    );
  }

  public findAnyWithEntrypoint(entrypoint: string, adminIdentity: string): IDatastoreVersionRecord {
    return (
      adminIdentity
        ? this.findByEntrypointAndAdminQuery.get(entrypoint, adminIdentity)
        : this.findByEntrypointQuery.get(entrypoint)
    ) as IDatastoreVersionRecord;
  }

  public findLatestByDomain(domain: string): string {
    return this.findWithDomainQuery.pluck().get(domain.toLowerCase()) as string;
  }

  public paginate(results = 100, offset = 0): IDatastoreVersionRecord[] {
    return this.allQuery.all(results, offset) as any;
  }

  public allCached(): IDatastoreVersionRecord[] {
    return Object.values(this.cacheByVersionHash);
  }

  public setDbxStopped(dbxPath: string): IDatastoreVersionRecord {
    for (const cached of this.allCached()) {
      if (cached.dbxPath === dbxPath) {
        this.db
          .prepare(`update ${this.tableName} set isStarted=0 where versionHash=?`)
          .run(cached.versionHash);
        cached.isStarted = false;
        return cached;
      }
    }
  }

  public delete(versionHash: string): IDatastoreVersionRecord {
    const record = this.getByHash(versionHash);
    this.db
      .prepare(`delete from ${this.tableName} where versionHash=$versionHash`)
      .run({ versionHash });
    delete this.cacheByVersionHash[versionHash];
    return record;
  }

  public cleanup(versionHash: string): void {
    const cached = this.cacheByVersionHash[versionHash];
    if (cached) {
      cached.dbxPath = null;
    }
    // we might want to just delete these records eventually, but need to ensure it isn't the baseVersionHash for other versions
    this.db
      .prepare(`update ${this.tableName} set dbxPath=null where versionHash=$versionHash`)
      .run({ versionHash });
  }

  public restore(versionHash: string, dbxPath: string, expiresTimestamp: number): void {
    this.db
      .prepare(
        `update ${this.tableName} set dbxPath=$dbxPath, expiresTimestamp=$expiresTimestamp where versionHash=$versionHash`,
      )
      .run({ versionHash, dbxPath, expiresTimestamp });
    const cached = this.cacheByVersionHash[versionHash];
    if (cached) {
      cached.expiresTimestamp = expiresTimestamp;
    }
  }

  public recordPublishedToNetworkDate(
    versionHash: string,
    publishedToNetworkTimestamp: number,
  ): void {
    this.db
      .prepare(
        `update ${this.tableName} set publishedToNetworkTimestamp=$publishedToNetworkTimestamp where versionHash=$versionHash`,
      )
      .run({ versionHash, publishedToNetworkTimestamp });
    const cached = this.cacheByVersionHash[versionHash];
    if (cached) {
      cached.publishedToNetworkTimestamp = publishedToNetworkTimestamp;
    }
  }

  public save(
    versionHash: string,
    scriptEntrypoint: string,
    versionTimestamp: number,
    dbxPath: string,
    baseVersionHash: string,
    domain: string,
    source: IDatastoreVersionRecord['source'],
    sourceHost: string,
    installAllowedNewLinkedVersionHistory: boolean,
    adminIdentity: string,
    adminSignature: Buffer,
    expiresTimestamp: number,
    networkKeyHash?: Buffer,
    publishedToNetworkTimestamp?: number,
  ): void {
    domain = domain?.toLowerCase();

    const isStarted = true;

    this.insertNow([
      versionHash,
      baseVersionHash,
      dbxPath,
      versionTimestamp,
      scriptEntrypoint,
      domain,
      source,
      sourceHost,
      installAllowedNewLinkedVersionHistory ? 1 : 0,
      adminIdentity,
      adminSignature,
      expiresTimestamp,
      networkKeyHash,
      publishedToNetworkTimestamp,
      isStarted ? 1 : 0,
    ]);
    this.cacheByVersionHash[versionHash] = {
      versionHash,
      baseVersionHash,
      dbxPath,
      versionTimestamp,
      scriptEntrypoint,
      domain,
      isStarted,
      source,
      sourceHost,
      installAllowedNewLinkedVersionHistory,
      adminIdentity,
      adminSignature,
      expiresTimestamp,
      networkKeyHash,
      publishedToNetworkTimestamp,
    };
    this.updateBaseVersionCache(versionHash, versionTimestamp, baseVersionHash);
  }

  public getLatestVersion(versionHash: string): string {
    const baseHash = this.getBaseHash(versionHash) ?? versionHash;
    const versions = this.getLinkedVersions(baseHash);
    if (!versions.length) return versionHash;
    return versions[0]?.versionHash;
  }

  public getLinkedVersions(baseVersionHash: string): IVersionHistoryEntry[] {
    if (!this.versionsByBaseHash[baseVersionHash]) {
      const versionRecords = this.findWithBaseHashQuery.all(
        baseVersionHash,
      ) as IDatastoreVersionRecord[];
      const seenVersions = new Set<string>();
      this.versionsByBaseHash[baseVersionHash] = versionRecords
        .map(x => {
          if (seenVersions.has(x.versionHash)) return null;
          seenVersions.add(x.versionHash);

          return {
            versionHash: x.versionHash,
            versionTimestamp: x.versionTimestamp,
          };
        })
        .filter(Boolean);
    }
    return this.versionsByBaseHash[baseVersionHash];
  }

  public getBaseHash(versionHash: string): string {
    return this.getByHash(versionHash)?.baseVersionHash;
  }

  public getByHash(versionHash: string): IDatastoreVersionRecord {
    if (!this.cacheByVersionHash[versionHash]) {
      const entry = this.getQuery.get(versionHash) as IDatastoreVersionRecord;
      if (entry) {
        entry.isStarted = !!entry.isStarted;
        this.cacheByVersionHash[versionHash] = entry;
      }
    }

    return this.cacheByVersionHash[versionHash];
  }

  public getByNetworkKey(key: Buffer): IDatastoreVersionRecord {
    return this.getByNetworkKeyQuery.get(key) as IDatastoreVersionRecord;
  }

  private updateBaseVersionCache(
    versionHash: string,
    versionTimestamp: number,
    baseVersionHash: string,
  ): void {
    this.versionsByBaseHash[baseVersionHash] ??= this.getLinkedVersions(baseVersionHash);
    if (!this.versionsByBaseHash[baseVersionHash].some(x => x.versionHash === versionHash)) {
      this.versionsByBaseHash[baseVersionHash].unshift({ versionHash, versionTimestamp });
      this.versionsByBaseHash[baseVersionHash].sort(
        (a, b) => b.versionTimestamp - a.versionTimestamp,
      );
    }
  }
}

export interface IDatastoreVersionRecord {
  versionHash: string;
  versionTimestamp: number;
  baseVersionHash: string;
  scriptEntrypoint: string;
  dbxPath: string;
  expiresTimestamp: number;
  networkKeyHash: Buffer;
  publishedToNetworkTimestamp: number;
  source: 'disk' | 'start' | 'upload' | 'upload:create-storage' | 'cluster' | 'network';
  sourceHost: string;
  installAllowedNewLinkedVersionHistory: boolean;
  adminIdentity: string | undefined;
  adminSignature: Buffer | undefined;
  isStarted: boolean;
  domain: string;
}
