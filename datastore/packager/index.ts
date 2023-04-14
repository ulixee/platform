import * as Path from 'path';
import { IFetchMetaResponseData } from '@ulixee/datastore-core/interfaces/ILocalDatastoreProcess';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import LocalDatastoreProcess from '@ulixee/datastore-core/lib/LocalDatastoreProcess';
import DatastoreManifest from '@ulixee/datastore-core/lib/DatastoreManifest';
import UlixeeConfig from '@ulixee/commons/config';
import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import schemaFromJson from '@ulixee/schema/lib/schemaFromJson';
import schemaToInterface, { printNode } from '@ulixee/schema/lib/schemaToInterface';
import { ISchemaAny, object } from '@ulixee/schema';
import { filterUndefined } from '@ulixee/commons/lib/objectUtils';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import Dbx from './lib/Dbx';
import rollupDatastore from './lib/rollupDatastore';

export default class DatastorePackager extends TypedEventEmitter<{ build: void }> {
  public script: string;
  public sourceMap: string;
  public dbx: Dbx;
  public meta: IFetchMetaResponseData;

  public get manifest(): DatastoreManifest {
    return this.dbx.manifest;
  }

  public get dbxPath(): string {
    return Path.join(this.outDir, `${this.filename}.dbx`);
  }

  private readonly entrypoint: string;
  private readonly filename: string;
  private onClose: (() => Promise<void>)[] = [];

  constructor(entrypoint: string, private readonly outDir?: string, private logToConsole = false) {
    super();
    this.entrypoint = Path.resolve(entrypoint);
    this.outDir ??=
      UlixeeConfig.load({ entrypoint: this.entrypoint, workingDirectory: process.cwd() })
        ?.datastoreOutDir ?? Path.dirname(this.entrypoint);
    this.outDir = Path.resolve(this.outDir);
    this.filename = Path.basename(this.entrypoint, Path.extname(this.entrypoint));
    this.dbx = new Dbx(this.dbxPath);
  }

  public async close(): Promise<void> {
    for (const onclose of this.onClose) {
      await onclose();
    }
  }

  public async build(options?: {
    tsconfig?: string;
    compiledSourcePath?: string;
    createNewVersionHistory?: boolean;
    createTemporaryVersionHash?: boolean;
    watch?: boolean;
  }): Promise<Dbx> {
    const rollup = await rollupDatastore(options?.compiledSourcePath ?? this.entrypoint, {
      outDir: this.dbx.path,
      tsconfig: options?.tsconfig,
      watch: options?.watch,
    });
    if (options?.watch) {
      this.onClose.push(() => rollup.close());
    }

    this.meta ??= await this.findDatastoreMeta();
    if (!this.meta.coreVersion) {
      throw new Error('Datastore must specify a coreVersion');
    }
    await this.generateDetails(
      rollup.code,
      rollup.sourceMap,
      options?.createNewVersionHistory,
      options?.createTemporaryVersionHash,
    );

    rollup.events.on(
      'change',
      async ({ code, sourceMap }) =>
        await this.generateDetails(
          code,
          sourceMap,
          options?.createNewVersionHistory,
          options?.createTemporaryVersionHash,
        ),
    );
    return this.dbx;
  }

  public async createOrUpdateManifest(
    sourceCode: string,
    sourceMap: string,
    createNewVersionHistory = false,
    createTemporaryVersionHash = false,
  ): Promise<DatastoreManifest> {
    this.meta ??= await this.findDatastoreMeta();
    if (!this.meta.coreVersion) {
      throw new Error('Datastore must specify a coreVersion');
    }

    const extractorsByName: IDatastoreManifest['extractorsByName'] = {};
    const crawlersByName: IDatastoreManifest['crawlersByName'] = {};
    const tablesByName: IDatastoreManifest['tablesByName'] = {};
    const schemaInterface: {
      tables: Record<string, ISchemaAny>;
      crawlers: Record<string, ISchemaAny>;
      extractors: Record<string, ISchemaAny>;
    } = { tables: {}, extractors: {}, crawlers: {} };

    if (this.meta.extractorsByName) {
      for (const [name, extractorMeta] of Object.entries(this.meta.extractorsByName)) {
        const { schema, pricePerQuery, minimumPrice, corePlugins } = extractorMeta;
        if (schema) {
          const fields = filterUndefined({
            input: schemaFromJson(schema?.input),
            output: schemaFromJson(schema?.output),
          });
          if (Object.keys(fields).length) {
            schemaInterface.extractors[name] = object(fields);
          }
        }

        extractorsByName[name] = {
          corePlugins,
          prices: [
            {
              perQuery: pricePerQuery ?? 0,
              minimum: minimumPrice ?? pricePerQuery ?? 0,
              addOns: extractorMeta.addOnPricing,
            },
          ],
          schemaAsJson: schema,
        };

        // lookup upstream pricing
        if (extractorMeta.remoteExtractor) {
          const extractorDetails = await this.lookupRemoteDatastoreExtractorPricing(
            this.meta,
            extractorMeta,
          );
          extractorsByName[name].prices.push(...extractorDetails.priceBreakdown);
        }
      }
    }

    if (this.meta.crawlersByName) {
      for (const [name, crawler] of Object.entries(this.meta.crawlersByName)) {
        const { schema, pricePerQuery, minimumPrice, corePlugins } = crawler;
        if (schema) {
          const fields = filterUndefined({
            input: schemaFromJson(schema?.input),
            output: schemaFromJson(schema?.output),
          });
          if (Object.keys(fields).length) {
            schemaInterface.crawlers[name] = object(fields);
          }
        }

        crawlersByName[name] = {
          corePlugins,
          prices: [
            {
              perQuery: pricePerQuery ?? 0,
              minimum: minimumPrice ?? pricePerQuery ?? 0,
              addOns: crawler.addOnPricing,
            },
          ],
          schemaAsJson: schema,
        };

        // lookup upstream pricing
        if (crawler.remoteCrawler) {
          const extractorDetails = await this.lookupRemoteDatastoreCrawlerPricing(this.meta, crawler);
          crawlersByName[name].prices.push(...extractorDetails.priceBreakdown);
        }
      }
    }

    if (this.meta.tablesByName) {
      for (const [name, tableMeta] of Object.entries(this.meta.tablesByName)) {
        // don't publish private tables
        if (tableMeta.isPublic === false) continue;
        const { schema } = tableMeta;
        if (schema) {
          schemaInterface.tables[name] = schemaFromJson(schema);
        }

        tablesByName[name] = {
          schemaAsJson: schema,
          prices: [{ perQuery: tableMeta.pricePerQuery ?? 0 }],
        };

        // lookup upstream pricing
        if (tableMeta.remoteTable) {
          const paymentDetails = await this.lookupRemoteDatastoreTablePricing(this.meta, tableMeta);
          tablesByName[name].prices.push(...paymentDetails.priceBreakdown);
        }
      }
    }

    const interfaceString = printNode(schemaToInterface(schemaInterface));

    const hash = sha256(Buffer.from(sourceCode));
    const scriptVersionHash = encodeBuffer(hash, 'scr');
    await this.manifest.update(
      this.entrypoint,
      scriptVersionHash,
      Date.now(),
      interfaceString,
      extractorsByName,
      crawlersByName,
      tablesByName,
      this.meta,
      this.logToConsole ? console.log : undefined,
      createTemporaryVersionHash,
    );
    if (createNewVersionHistory) {
      await this.manifest.setLinkedVersions(this.entrypoint, []);
    }
    this.script = sourceCode;
    this.sourceMap = sourceMap;
    return this.manifest;
  }

  protected async generateDetails(
    code: string,
    sourceMap: string,
    createNewVersionHistory: boolean,
    createTemporaryVersionHash: boolean,
  ): Promise<void> {
    this.meta = await this.findDatastoreMeta();
    const dbx = this.dbx;
    dbx.createOrUpdateDatabase(this.meta.tablesByName, this.meta.tableSeedlingsByName);

    this.manifest.addToVersionHistory = createTemporaryVersionHash !== true;

    await this.createOrUpdateManifest(
      code,
      sourceMap,
      createNewVersionHistory,
      createTemporaryVersionHash,
    );
    await dbx.createOrUpdateDocpage(this.meta, this.manifest, this.entrypoint);
    this.emit('build');
  }

  protected async lookupRemoteDatastoreExtractorPricing(
    meta: IFetchMetaResponseData,
    extractor: IFetchMetaResponseData['extractorsByName'][0],
  ): Promise<IDatastoreApiTypes['Datastore.meta']['result']['extractorsByName'][0]> {
    const extractorName = extractor.remoteExtractor;

    const { remoteHost, datastoreVersionHash } = this.getRemoteSourceAndVersionHash(
      meta,
      extractor.remoteSource,
    );

    const remoteMeta = {
      host: remoteHost,
      datastoreVersionHash,
      extractorName,
    };

    try {
      const upstreamMeta = await this.getDatastoreMeta(remoteHost, datastoreVersionHash);
      const remoteExtractorDetails = upstreamMeta.extractorsByName[extractorName];
      remoteExtractorDetails.priceBreakdown[0].remoteMeta = remoteMeta;
      return remoteExtractorDetails;
    } catch (error) {
      console.error('ERROR loading remote datastore pricing', remoteMeta, error);
      throw error;
    }
  }

  protected async lookupRemoteDatastoreCrawlerPricing(
    meta: IFetchMetaResponseData,
    crawler: IFetchMetaResponseData['crawlersByName'][0],
  ): Promise<IDatastoreApiTypes['Datastore.meta']['result']['crawlersByName'][0]> {
    const crawlerName = crawler.remoteCrawler;
    const { remoteHost, datastoreVersionHash } = this.getRemoteSourceAndVersionHash(
      meta,
      crawler.remoteSource,
    );
    const remoteMeta = {
      host: remoteHost,
      datastoreVersionHash,
      crawlerName,
    };
    try {
      const upstreamMeta = await this.getDatastoreMeta(remoteHost, datastoreVersionHash);
      const remoteExtractorDetails = upstreamMeta.crawlersByName[crawlerName];
      remoteExtractorDetails.priceBreakdown[0].remoteMeta = remoteMeta;
      return remoteExtractorDetails;
    } catch (error) {
      console.error('ERROR loading remote datastore pricing', remoteMeta, error);
      throw error;
    }
  }

  protected async lookupRemoteDatastoreTablePricing(
    meta: IFetchMetaResponseData,
    table: IFetchMetaResponseData['tablesByName'][0],
  ): Promise<IDatastoreApiTypes['Datastore.meta']['result']['tablesByName'][0]> {
    const tableName = table.remoteTable;

    const { remoteHost, datastoreVersionHash } = this.getRemoteSourceAndVersionHash(
      meta,
      table.remoteSource,
    );
    const remoteMeta = {
      host: remoteHost,
      datastoreVersionHash,
      tableName,
    };

    try {
      const upstreamMeta = await this.getDatastoreMeta(remoteHost, datastoreVersionHash);
      const remoteDetails = upstreamMeta.tablesByName[tableName];
      remoteDetails.priceBreakdown[0].remoteMeta = remoteMeta;
      return remoteDetails;
    } catch (error) {
      console.error('ERROR loading remote datastore pricing', remoteMeta, error);
      throw error;
    }
  }

  private async getDatastoreMeta(
    host: string,
    datastoreVersionHash: string,
  ): Promise<IDatastoreApiTypes['Datastore.meta']['result']> {
    const datastoreApiClient = new DatastoreApiClient(host, this.logToConsole);
    try {
      return await datastoreApiClient.getMeta(datastoreVersionHash);
    } finally {
      await datastoreApiClient.disconnect();
    }
  }

  private getRemoteSourceAndVersionHash(
    meta: IFetchMetaResponseData,
    remoteSource: string,
  ): {
    remoteHost: string;
    datastoreVersionHash: string;
  } {
    const url = meta.remoteDatastores[remoteSource];
    if (!url)
      throw new Error(
        `The remoteDatastore could not be found for the key - ${remoteSource}. It should be defined in remoteDatastores on your Datastore.`,
      );

    let remoteUrl: URL;
    try {
      remoteUrl = new URL(url);
    } catch (err) {
      throw new Error(`The remoteDatastore url for "${remoteSource}" is not a valid url (${url})`);
    }

    const [datastoreVersionHash] = remoteUrl.pathname.match(/dbx1[ac-hj-np-z02-9]{18}/);
    DatastoreManifest.validateVersionHash(datastoreVersionHash);
    return { datastoreVersionHash, remoteHost: remoteUrl.host };
  }

  private async findDatastoreMeta(): Promise<IFetchMetaResponseData> {
    const entrypoint = this.dbx.entrypoint;
    const datastoreProcess = new LocalDatastoreProcess(entrypoint);
    const meta = await datastoreProcess.fetchMeta();
    await new Promise(resolve => setTimeout(resolve, 1e3));
    await datastoreProcess.close();
    return meta;
  }
}
