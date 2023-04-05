import * as Tar from 'tar';
import * as Fs from 'fs/promises';
import * as Path from 'path';
import * as Database from 'better-sqlite3';
import DatastoreManifest from '@ulixee/datastore-core/lib/DatastoreManifest';
import Identity from '@ulixee/crypto/lib/Identity';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { SqlGenerator } from '@ulixee/sql-engine';
import { IFetchMetaResponseData } from '@ulixee/datastore-core/interfaces/ILocalDatastoreProcess';
import { unlinkSync } from 'fs';
import RunnerInternal from '@ulixee/datastore/lib/RunnerInternal';
import StringSchema from '@ulixee/schema/lib/StringSchema';
import { IRunnerSchema } from '@ulixee/datastore';
import moment = require('moment');
import IDocpageConfig from '../interfaces/IDocpageConfig';

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
    const title = meta.name || entrypoint.match(/([^/\\]+)\.(js|ts)$/)[1] || 'Untitled';

    let defaultExample: IDocpageConfig['defaultExample'];
    for (const table of Object.values(meta.tablesByName)) {
      if (table.isPublic) {
        defaultExample = {
          type: 'table',
          formatted: table.name,
          args: null,
          name: table.name,
        };
        break;
      }
    }
    if (!defaultExample) {
      const functions = [
        ...Object.values(meta.crawlersByName),
        ...Object.values(meta.runnersByName),
      ];
      const useFunction = functions.find(x => x.schema?.inputExamples?.length) ?? functions[0];
      const type = meta.runnersByName[useFunction?.name] ? 'runner' : 'crawler';
      if (useFunction?.schema) {
        const args: Record<string, any> = {};
        if (useFunction.schema.inputExamples?.length) {
          RunnerInternal.fillInputWithExamples(useFunction.schema, args);
        } else {
          for (const [name, field] of Object.entries(
            (useFunction.schema?.input as IRunnerSchema['input']) ?? {},
          )) {
            if (field.optional === true) continue;
            if (field.format === 'time') args[name] = moment().format(StringSchema.TimeFormat);
            else if (field.format === 'date') args[name] = moment().format(StringSchema.DateFormat);
            else if (field.format === 'url') args[name] = '<USER SUPPLIED URL>';
            else if (field.format === 'email') args[name] = '<USER SUPPLIED EMAIL>';
            else if (field.enum) args[name] = field.enum[0];

            args[name] ??= `<USER SUPPLIED ${field.typeName}>`;
          }
        }

        const keys = Object.keys(args).map((key, i) => `${key} => $${i + 1}`);
        defaultExample = {
          type,
          formatted: `${useFunction.name}(${keys.join(', ')})`,
          args,
          name: useFunction.name,
        };
      } else if (useFunction) {
        defaultExample = {
          type,
          formatted: `${useFunction.name}()`,
          args: {},
          name: useFunction.name,
        };
      }
    }

    defaultExample ??= { type: 'table', formatted: 'default', args: null, name: 'default' };

    const config: IDocpageConfig = {
      versionHash: manifest.versionHash,
      name: title.charAt(0).toUpperCase() + title.slice(1),
      description: meta.description,
      defaultExample,
      createdAt: new Date(manifest.versionTimestamp).toISOString(),
      runnersByName: Object.entries(meta.runnersByName).reduce((obj, [name, entry]) => {
        return Object.assign(obj, {
          [name]: {
            name,
            description: entry.description || '',
            schema: entry.schema,
            prices: manifest.runnersByName[name].prices,
          },
        });
      }, {}),
      crawlersByName: Object.entries(meta.crawlersByName).reduce((obj, [name, entry]) => {
        return Object.assign(obj, {
          [name]: {
            name,
            description: entry.description || '',
            schema: entry.schema,
            prices: manifest.crawlersByName[name].prices,
          },
        });
      }, {}),
      tablesByName: Object.entries(meta.tablesByName).reduce((obj, [name, entry]) => {
        if (entry.isPublic === false) return;
        return Object.assign(obj, {
          [name]: {
            name,
            description: entry.description || '',
            schema: entry.schema,
            prices: manifest.tablesByName[name].prices,
          },
        });
      }, {}),
    };

    await Fs.writeFile(Path.join(this.path, 'docpage.json'), JSON.stringify(config));
  }

  public async tarGzip(): Promise<Buffer> {
    await Tar.create(
      {
        gzip: true,
        cwd: this.path,
        file: `${this.path}.tgz`,
      },
      ['datastore.js', 'datastore.js.map', 'datastore-manifest.json', 'storage.db', 'docpage.json'],
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
    const compressedDatastore = await this.tarGzip();

    const client = new DatastoreApiClient(host);
    try {
      return await client.upload(compressedDatastore, options);
    } finally {
      await client.disconnect();
    }
  }
}