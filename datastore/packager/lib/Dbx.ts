import * as Tar from 'tar';
import * as Fs from 'fs/promises';
import * as Path from 'path';
import * as Database from 'better-sqlite3';
import DatastoreManifest from '@ulixee/datastore-core/lib/DatastoreManifest';
import Identity from '@ulixee/crypto/lib/Identity';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { SqlGenerator } from '@ulixee/sql-engine';
import { IFetchMetaResponseData } from '@ulixee/datastore-core/interfaces/ILocalDatastoreProcess';
import { buildDocpage } from '@ulixee/datastore-docpage';
import { unlinkSync } from 'fs';

export default class Dbx {
  public manifest: DatastoreManifest;

  public get entrypoint(): string {
    return `${this.path}/datastore.js`;
  }

  constructor(public readonly path: string) {
    this.manifest = new DatastoreManifest(Path.join(this.path, 'datastore-manifest.json'));
  }

  public async getEmbeddedManifest(): Promise<DatastoreManifest> {
    // read from the dbx if from file
    const manifest = this.manifest;
    await manifest.load();
    return manifest;
  }

  public createOrUpdateDatabase(
    tablesByName: IFetchMetaResponseData['tablesByName'],
    seedlingsByName: IFetchMetaResponseData['tableSeedlingsByName'],
  ): void {
    const dbPath = Path.join(this.path, 'storage.db');
    try {
      // remove for now. eventually need to figure out migrations
      unlinkSync(dbPath);
    } catch {}
    const db = new Database(dbPath);

    const tables = new Set(
      db.prepare(`SELECT name FROM sqlite_master where type='table'`).pluck().all(),
    );

    for (const name of Object.keys(tablesByName)) {
      const { schema, remoteSource } = tablesByName[name];
      // don't create a remote table
      if (remoteSource) continue;
      if (tables.has(name)) continue;

      SqlGenerator.createTableFromSchema(name, schema, sql => {
        db.prepare(sql).run();
      });
      // don't add seedling if already exists
      const seedlings = seedlingsByName[name];
      SqlGenerator.createInsertsFromSeedlings(name, seedlings, schema, (sql, values) => {
        db.prepare(sql).run(values);
      });
    }
    db.close();
  }

  public async createOrUpdateDocpage(
    meta: IFetchMetaResponseData,
    manifest: DatastoreManifest,
    entrypoint: string,
  ): Promise<void> {
    const docpageDir = Path.join(this.path, 'docpage');
    const name = meta.name || entrypoint.match(/([^/\\]+)\.(js|ts)$/)[1] || 'Untitled';

    const config = {
      versionHash: manifest.versionHash,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      description: meta.description,
      createdAt: new Date().toISOString(),
      runnersByName: Object.keys(meta.runnersByName).reduce((obj, n) => {
        return Object.assign(obj, {
          [n]: {
            name: n,
            description: meta.runnersByName[n].description || '',
            schema: meta.runnersByName[n].schema,
            prices: manifest.runnersByName[n].prices,
          },
        });
      }, {}),
      tablesByName: Object.keys(meta.tablesByName).reduce((obj, n) => {
        return Object.assign(obj, {
          [n]: {
            name: n,
            description: meta.tablesByName[n].description || '',
            schema: meta.tablesByName[n].schema,
          },
        });
      }, {}),
    };

    await buildDocpage(config, docpageDir);
  }

  public async asBuffer(): Promise<Buffer> {
    await Tar.create(
      {
        gzip: true,
        cwd: this.path,
        file: `${this.path}.tgz`,
      },
      ['datastore.js', 'datastore.js.map', 'datastore-manifest.json', 'storage.db', 'docpage'],
    );
    const buffer = await Fs.readFile(`${this.path}.tgz`);
    await Fs.unlink(`${this.path}.tgz`);
    return buffer;
  }

  public async upload(
    host: string,
    options: {
      allowNewLinkedVersionHistory?: boolean;
      identity?: Identity;
      timeoutMs?: number;
    } = {},
  ): Promise<{ success: boolean }> {
    const compressedDatastore = await this.asBuffer();

    const client = new DatastoreApiClient(host);
    try {
      return await client.upload(compressedDatastore, options);
    } finally {
      await client.disconnect();
    }
  }
}
