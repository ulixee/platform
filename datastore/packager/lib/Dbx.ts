import Identity from '@ulixee/platform-utils/lib/Identity';
import { IFetchMetaResponseData } from '@ulixee/datastore-core/interfaces/ILocalDatastoreProcess';
import DatastoreManifest from '@ulixee/datastore-core/lib/DatastoreManifest';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import ExtractorInternal from '@ulixee/datastore/lib/ExtractorInternal';
import * as Fs from 'fs/promises';
import * as Path from 'path';
import * as Tar from 'tar';
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
        ...Object.values(meta.extractorsByName),
      ];
      const useFunction = functions.find(x => x.schema?.inputExamples?.length) ?? functions[0];
      const type = meta.extractorsByName[useFunction?.name] ? 'extractor' : 'crawler';
      if (useFunction) {
        const { formatted, args } = ExtractorInternal.createExampleCall(
          useFunction?.name,
          useFunction?.schema,
        );
        defaultExample = {
          type,
          name: useFunction.name,
          formatted,
          args,
        };
      }
    }

    defaultExample ??= { type: 'table', formatted: 'default', args: null, name: 'default' };

    const config: IDocpageConfig = {
      datastoreId: manifest.id,
      version: manifest.version,
      name: title.charAt(0).toUpperCase() + title.slice(1),
      description: meta.description,
      defaultExample,
      createdAt: new Date(manifest.versionTimestamp).toISOString(),
      extractorsByName: Object.entries(meta.extractorsByName).reduce((obj, [name, entry]) => {
        return Object.assign(obj, {
          [name]: {
            name,
            description: entry.description || '',
            schema: entry.schema ?? { input: {}, output: {} },
            prices: manifest.extractorsByName[name].prices,
          },
        });
      }, {}),
      crawlersByName: Object.entries(meta.crawlersByName).reduce((obj, [name, entry]) => {
        return Object.assign(obj, {
          [name]: {
            name,
            description: entry.description || '',
            schema: entry.schema ?? { input: {}, output: {} },
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
            schema: entry.schema ?? {},
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
      ['datastore.js', 'datastore.js.map', 'datastore-manifest.json', 'docpage.json'],
    );
    const buffer = await Fs.readFile(`${this.path}.tgz`);
    await Fs.unlink(`${this.path}.tgz`);
    return buffer;
  }

  public async upload(
    host: string,
    options: {
      identity?: Identity;
      timeoutMs?: number;
    } = {},
  ): Promise<{ success: boolean }> {
    const compressedDbx = await this.tarGzip();

    const client = new DatastoreApiClient(host);
    try {
      return await client.upload(compressedDbx, options);
    } finally {
      await client.disconnect();
    }
  }
}
