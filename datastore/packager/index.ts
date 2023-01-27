import * as Path from 'path';
import { IFetchMetaResponseData } from '@ulixee/datastore-core/interfaces/ILocalDatastoreProcess';
import { sha3 } from '@ulixee/commons/lib/hashUtils';
import LocalDatastoreProcess from '@ulixee/datastore-core/lib/LocalDatastoreProcess';
import DatastoreManifest from '@ulixee/datastore-core/lib/DatastoreManifest';
import UlixeeConfig from '@ulixee/commons/config';
import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import schemaFromJson from '@ulixee/schema/lib/schemaFromJson';
import schemaToInterface, { printNode } from '@ulixee/schema/lib/schemaToInterface';
import { ISchemaAny, object } from '@ulixee/schema';
import { filterUndefined } from '@ulixee/commons/lib/objectUtils';
import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { IDatastoreApiTypes } from '@ulixee/specification/datastore';
import rollupDatastore from './lib/rollupDatastore';
import DbxFile from './lib/DbxFile';

export default class DatastorePackager {
  public manifest: DatastoreManifest;
  public script: string;
  public sourceMap: string;
  public dbx: DbxFile;
  public meta: IFetchMetaResponseData;

  public get dbxPath(): string {
    return Path.join(this.outDir, `${this.filename}.dbx`);
  }

  private readonly entrypoint: string;
  private readonly filename: string;

  constructor(entrypoint: string, private readonly outDir?: string, private logToConsole = false) {
    this.entrypoint = Path.resolve(entrypoint);
    this.outDir ??=
      UlixeeConfig.load({ entrypoint: this.entrypoint, workingDirectory: process.cwd() })
        ?.datastoreOutDir ?? Path.dirname(this.entrypoint);
    this.outDir = Path.resolve(this.outDir);
    this.filename = Path.basename(this.entrypoint, Path.extname(this.entrypoint));
    this.dbx = new DbxFile(this.dbxPath);
    this.manifest = new DatastoreManifest(`${this.dbx.workingDirectory}/datastore-manifest.json`);
  }

  public async build(options?: {
    tsconfig?: string;
    compiledSourcePath?: string;
    keepOpen?: boolean;
    createNewVersionHistory?: boolean;
  }): Promise<DbxFile> {
    const dbx = this.dbx;
    if ((await dbx.exists()) && !(await dbx.isOpen())) {
      await dbx.open(true);
    }
    const { sourceCode, sourceMap } = await this.rollup(options);

    this.meta ??= await this.findDatastoreMeta();
    if (!this.meta.coreVersion) {
      throw new Error('Datastore must specify a coreVersion');
    }
    dbx.createOrUpdateDatabase(this.meta.tablesByName, this.meta.tableSeedlingsByName);

    await this.createOrUpdateManifest(sourceCode, sourceMap, options?.createNewVersionHistory);
    await dbx.createOrUpdateDocpage(this.meta, this.manifest, this.entrypoint);
    await dbx.save(options?.keepOpen);

    return dbx;
  }

  public async rollup(options?: {
    tsconfig?: string;
    compiledSourcePath?: string;
  }): Promise<{ sourceMap: string; sourceCode: string }> {
    const rollup = await rollupDatastore(options?.compiledSourcePath ?? this.entrypoint, {
      outDir: this.dbx.workingDirectory,
      tsconfig: options?.tsconfig,
    });
    return { sourceMap: rollup.sourceMap, sourceCode: rollup.code.toString('utf8') };
  }

  public async createOrUpdateManifest(
    sourceCode: string,
    sourceMap: string,
    createNewVersionHistory = false,
  ): Promise<DatastoreManifest> {
    this.meta ??= await this.findDatastoreMeta();
    if (!this.meta.coreVersion) {
      throw new Error('Datastore must specify a coreVersion');
    }

    const runnersByName: IDatastoreManifest['runnersByName'] = {};
    const tablesByName: IDatastoreManifest['tablesByName'] = {};
    const schemaInterface: {
      tables: Record<string, ISchemaAny>;
      runners: Record<string, ISchemaAny>;
    } = { tables: {}, runners: {} };

    if (this.meta.runnersByName) {
      for (const [name, runnerMeta] of Object.entries(this.meta.runnersByName)) {
        const { schema, pricePerQuery, minimumPrice, corePlugins } = runnerMeta;
        if (schema) {
          const fields = filterUndefined({
            input: schemaFromJson(schema?.input),
            output: schemaFromJson(schema?.output),
          });
          if (Object.keys(fields).length) {
            schemaInterface.runners[name] = object(fields);
          }
        }

        runnersByName[name] = {
          corePlugins,
          prices: [
            {
              perQuery: pricePerQuery ?? 0,
              minimum: minimumPrice ?? pricePerQuery ?? 0,
              addOns: runnerMeta.addOnPricing,
            },
          ],
          schemaAsJson: schema,
        };

        // lookup upstream pricing
        if (runnerMeta.remoteRunner) {
          const runnerDetails = await this.lookupRemoteDatastoreRunnerPricing(
            this.meta,
            runnerMeta,
          );
          runnersByName[name].prices.push(...runnerDetails.priceBreakdown);
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

    const hash = sha3(Buffer.from(sourceCode));
    const scriptVersionHash = encodeBuffer(hash, 'scr');
    await this.manifest.update(
      this.entrypoint,
      scriptVersionHash,
      Date.now(),
      interfaceString,
      runnersByName,
      tablesByName,
      this.meta,
      this.logToConsole ? console.log : undefined,
    );
    if (createNewVersionHistory) {
      await this.manifest.setLinkedVersions(this.entrypoint, []);
    }
    this.script = sourceCode;
    this.sourceMap = sourceMap;
    return this.manifest;
  }

  protected async lookupRemoteDatastoreRunnerPricing(
    meta: IFetchMetaResponseData,
    runner: IFetchMetaResponseData['runnersByName'][0],
  ): Promise<IDatastoreApiTypes['Datastore.meta']['result']['runnersByName'][0]> {
    const runnerName = runner.remoteRunner;
    const url = meta.remoteDatastores[runner.remoteSource];
    if (!url)
      throw new Error(
        `The remoteDatastore could not be found for the key - ${runner.remoteRunner}. It should be defined in remoteDatastores on your Datastore.`,
      );

    let remoteUrl: URL;
    try {
      remoteUrl = new URL(url);
    } catch (err) {
      throw new Error(
        `The remoteDatastore url for "${runner.remoteRunner}" is not a valid url (${url})`,
      );
    }

    const [datastoreVersionHash] = remoteUrl.pathname.match(/dbx1[ac-hj-np-z02-9]{18}/)
    DatastoreManifest.validateVersionHash(datastoreVersionHash);

    const remoteMeta = {
      host: remoteUrl.host,
      datastoreVersionHash,
      runnerName,
    };
    const datastoreApiClient = new DatastoreApiClient(remoteUrl.host, this.logToConsole);
    try {
      const upstreamMeta = await datastoreApiClient.getMeta(datastoreVersionHash);
      const remoteRunnerDetails = upstreamMeta.runnersByName[runnerName];
      remoteRunnerDetails.priceBreakdown[0].remoteMeta = remoteMeta;
      return remoteRunnerDetails;
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
    const url = meta.remoteDatastores[table.remoteSource];
    if (!url)
      throw new Error(
        `The remoteDatastore could not be found for the key - ${table.remoteTable}. It should be defined in remoteDatastores on your Datastore.`,
      );

    let remoteUrl: URL;
    try {
      remoteUrl = new URL(url);
    } catch (err) {
      throw new Error(
        `The remoteDatastore url for "${table.remoteTable}" is not a valid url (${url})`,
      );
    }

    const [datastoreVersionHash] = remoteUrl.pathname.match(/dbx1[ac-hj-np-z02-9]{18}/)
    DatastoreManifest.validateVersionHash(datastoreVersionHash);

    const remoteMeta = {
      host: remoteUrl.host,
      datastoreVersionHash,
      tableName,
    };
    const datastoreApiClient = new DatastoreApiClient(remoteUrl.host, this.logToConsole);
    try {
      const upstreamMeta = await datastoreApiClient.getMeta(datastoreVersionHash);
      const remoteDetails = upstreamMeta.tablesByName[tableName];
      remoteDetails.priceBreakdown[0].remoteMeta = remoteMeta;
      return remoteDetails;
    } catch (error) {
      console.error('ERROR loading remote datastore pricing', remoteMeta, error);
      throw error;
    }
  }

  private async findDatastoreMeta(): Promise<IFetchMetaResponseData> {
    const entrypoint = `${this.dbx.workingDirectory}/datastore.js`;
    const datastoreProcess = new LocalDatastoreProcess(entrypoint);
    const meta = await datastoreProcess.fetchMeta();
    await new Promise(resolve => setTimeout(resolve, 1e3));
    await datastoreProcess.close();
    return meta;
  }
}
