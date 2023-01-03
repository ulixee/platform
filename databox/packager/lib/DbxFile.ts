import * as Tar from 'tar';
import * as Fs from 'fs/promises';
import * as Path from 'path';
import * as Database from 'better-sqlite3';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import DataboxManifest from '@ulixee/databox-core/lib/DataboxManifest';
import Identity from '@ulixee/crypto/lib/Identity';
import DataboxApiClient from '@ulixee/databox/lib/DataboxApiClient';
import { SqlGenerator } from '@ulixee/sql-engine';
import { IFetchMetaResponseData } from '@ulixee/databox-core/interfaces/ILocalDataboxProcess';
import { buildDocpage } from '@ulixee/databox-docpage';

export default class DbxFile {
  public readonly workingDirectory: string;

  constructor(public readonly dbxPath: string) {
    this.workingDirectory = `${dbxPath}.build`;
  }

  public async exists(): Promise<boolean> {
    return await existsAsync(this.dbxPath);
  }

  public async isOpen(): Promise<boolean> {
    return await existsAsync(this.workingDirectory);
  }

  public async open(onlyManifest = false): Promise<boolean> {
    if (await this.exists()) {
      await this.createWorkingDirectory();
      await Tar.extract({
        cwd: this.workingDirectory,
        file: this.dbxPath,
        filter(path: string): boolean {
          if (onlyManifest) return path.endsWith('-manifest.json');
          return true;
        },
      });
      return true;
    }
    return false;
  }

  public async getEmbeddedManifest(): Promise<DataboxManifest> {
    // read from the dbx if from file
    await this.open();
    const manifest = new DataboxManifest(Path.join(this.workingDirectory, 'databox-manifest.json'));
    await manifest.load();
    await this.close();
    return manifest;
  }

  public createOrUpdateDatabase(tableByName: IFetchMetaResponseData['tablesByName']): void {
    const dbPath = Path.join(this.workingDirectory, 'databox-storage.db');
    const db = new Database(dbPath);

    for (const name of Object.keys(tableByName)) {
      const { schema, seedlings } = tableByName[name];
      SqlGenerator.createTableFromSchema(name, schema, sql => {
        db.prepare(sql).run();
      });

      SqlGenerator.createInsertsFromSeedlings(name, seedlings, schema, (sql, values) => {
        db.prepare(sql).run(values);
      });
    }
    db.close();
  }

  public async createOrUpdateDocpage(meta: IFetchMetaResponseData, entrypoint: string): Promise<void> {
    const docpageDir = Path.join(this.workingDirectory, 'docpage');
    const name = meta.name || entrypoint.match(/([^/]+)\.(js|ts)$/)[1] || 'Untitled';

    const config = {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      description: meta.description,
      createdAt: new Date().toISOString(),
      functionsByName: Object.keys(meta.functionsByName).reduce((obj, n) => {
        return Object.assign(obj, { 
          [n]: {
            name: n,
            description: meta.functionsByName[n].description || '',
            schema: meta.functionsByName[n].schema,
            pricePerQuery: meta.functionsByName[n].pricePerQuery,
          }
        });
      }, {}),
      tablesByName: Object.keys(meta.tablesByName).reduce((obj, n) => {
        return Object.assign(obj, { 
          [n]: {
            name: n,
            description: meta.tablesByName[n].description || '',
            schema: meta.tablesByName[n].schema,
          }
        });
      }, {}),
    }
    await buildDocpage(config, docpageDir);
  }

  public async save(keepOpen = false): Promise<void> {
    if (!(await existsAsync(this.workingDirectory))) return;
    await Tar.create(
      {
        gzip: true,
        cwd: this.workingDirectory,
        file: this.dbxPath,
      },
      ['databox.js', 'databox.js.map', 'databox-manifest.json', 'databox-storage.db', 'docpage'],
    );
    if (!keepOpen) await this.close();
  }

  public async delete(): Promise<void> {
    await Fs.unlink(this.dbxPath);
  }

  public async close(): Promise<void> {
    if (await existsAsync(this.workingDirectory)) {
      await Fs.rm(this.workingDirectory, { recursive: true });
    }
  }

  public asBuffer(): Promise<Buffer> {
    return Fs.readFile(this.dbxPath);
  }

  public async upload(
    host: string,
    options: {
      allowNewLinkedVersionHistory?: boolean;
      identity?: Identity;
      timeoutMs?: number;
    } = {},
  ): Promise<{ success: boolean }> {
    const compressedDatabox = await this.asBuffer();

    const client = new DataboxApiClient(host);
    try {
      return await client.upload(compressedDatabox, options);
    } finally {
      await client.disconnect();
    }
  }

  private async createWorkingDirectory(): Promise<void> {
    if (!(await existsAsync(this.workingDirectory))) {
      await Fs.mkdir(this.workingDirectory, { recursive: true });
    }
  }
}
