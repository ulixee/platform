import * as Path from 'path';
import { IFetchMetaResponseData } from '@ulixee/databox-core/interfaces/ILocalDataboxProcess';
import { sha3 } from '@ulixee/commons/lib/hashUtils';
import LocalDataboxProcess from '@ulixee/databox-core/lib/LocalDataboxProcess';
import DataboxManifest from '@ulixee/databox-core/lib/DataboxManifest';
import UlixeeConfig from '@ulixee/commons/config';
import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import schemaFromJson from '@ulixee/schema/lib/schemaFromJson';
import schemaToInterface, { printNode } from '@ulixee/schema/lib/schemaToInterface';
import { ISchemaAny, object } from '@ulixee/schema';
import { filterUndefined } from '@ulixee/commons/lib/objectUtils';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import DataboxApiClient from '@ulixee/databox/lib/DataboxApiClient';
import { IDataboxApiTypes } from '@ulixee/specification/databox';
import rollupDatabox from './lib/rollupDatabox';
import DbxFile from './lib/DbxFile';

export default class DataboxPackager {
  public manifest: DataboxManifest;
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
      UlixeeConfig.load({ entrypoint, workingDirectory: process.cwd() })?.databoxOutDir ??
      Path.dirname(this.entrypoint);
    this.outDir = Path.resolve(this.outDir);
    this.filename = Path.basename(this.entrypoint, Path.extname(this.entrypoint));
    this.dbx = new DbxFile(this.dbxPath);
    this.manifest = new DataboxManifest(`${this.dbx.workingDirectory}/databox-manifest.json`);
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

    this.meta ??= await this.findDataboxMeta();
    dbx.createOrUpdateDatabase(this.meta.tablesByName);
    
    await dbx.createOrUpdateDocpage(this.meta, this.entrypoint);
    await this.createOrUpdateManifest(sourceCode, sourceMap, options?.createNewVersionHistory);
    await dbx.save(options?.keepOpen);

    return dbx;
  }

  public async rollup(options?: {
    tsconfig?: string;
    compiledSourcePath?: string;
  }): Promise<{ sourceMap: string; sourceCode: string }> {
    const rollup = await rollupDatabox(options?.compiledSourcePath ?? this.entrypoint, {
      outDir: this.dbx.workingDirectory,
      tsconfig: options?.tsconfig,
    });
    return { sourceMap: rollup.sourceMap, sourceCode: rollup.code.toString('utf8') };
  }

  public async createOrUpdateManifest(
    sourceCode: string,
    sourceMap: string,
    createNewVersionHistory = false,
  ): Promise<DataboxManifest> {
    this.meta ??= await this.findDataboxMeta();
    if (!this.meta.coreVersion) {
      throw new Error('Databox must specify a coreVersion');
    }

    let interfaceString: string;
    const functionsByName: IDataboxManifest['functionsByName'] = {};
    if (this.meta.functionsByName) {
      const schemaInterface: Record<string, ISchemaAny> = {};
      for (const [name, functionMeta] of Object.entries(this.meta.functionsByName)) {
        const { schema, pricePerQuery, minimumPrice, corePlugins } = functionMeta;
        if (schema) {
          const fields = filterUndefined({
            input: schemaFromJson(schema?.input),
            output: schemaFromJson(schema?.output),
          });
          if (Object.keys(fields).length) {
            schemaInterface[name] = object(fields);
          }
        }
        functionsByName[name] = {
          corePlugins,
          prices: [
            {
              perQuery: pricePerQuery ?? 0,
              minimum: minimumPrice ?? pricePerQuery ?? 0,
              addOns: functionMeta.addOnPricing,
            },
          ],
        };

        // lookup upstream pricing
        if (functionMeta.remoteFunction) {
          const functionDetails = await this.lookupRemoteDataboxFunctionPricing(this.meta, functionMeta);
          functionsByName[name].prices.push(...functionDetails.priceBreakdown);
        }
      }
      if (Object.keys(schemaInterface).length) {
        interfaceString = printNode(schemaToInterface(schemaInterface));
      }
    }

    const hash = sha3(Buffer.from(sourceCode));
    const scriptVersionHash = encodeBuffer(hash, 'scr');
    await this.manifest.update(
      this.entrypoint,
      scriptVersionHash,
      Date.now(),
      this.meta.coreVersion,
      interfaceString,
      functionsByName,
      this.meta.remoteDataboxes,
      this.meta.paymentAddress,
      this.meta.giftCardIssuerIdentity,
      this.logToConsole ? console.log : undefined,
    );
    if (createNewVersionHistory) {
      await this.manifest.setLinkedVersions(this.entrypoint, []);
    }
    this.script = sourceCode;
    this.sourceMap = sourceMap;
    return this.manifest;
  }

  protected async lookupRemoteDataboxFunctionPricing(
    meta: IFetchMetaResponseData,
    func: IFetchMetaResponseData['functionsByName'][0],
  ): Promise<IDataboxApiTypes['Databox.meta']['result']['functionsByName'][0]> {
    const [remoteDataboxName, functionName] = func.remoteFunction.split('.');
    const url = meta.remoteDataboxes[remoteDataboxName];
    if (!url)
      throw new Error(
        `The remoteDatabox could not be found for the key - ${func.remoteFunction}. It should be defined in remoteDataboxes on your Databox.`,
      );

    let remoteUrl: URL;
    try {
      remoteUrl = new URL(url);
    } catch (err) {
      throw new Error(
        `The remoteDatabox url for "${func.remoteFunction}" is not a valid url (${url})`,
      );
    }

    const databoxVersionHash = remoteUrl.pathname.slice(1);
    DataboxManifest.validateVersionHash(databoxVersionHash);

    const remoteMeta = {
      host: remoteUrl.host,
      databoxVersionHash,
      functionName,
    };
    const databoxApiClient = new DataboxApiClient(remoteUrl.host);
    try {
      const upstreamMeta = await databoxApiClient.getMeta(databoxVersionHash);
      const remoteFunctionDetails = upstreamMeta.functionsByName[functionName];
      remoteFunctionDetails.priceBreakdown[0].remoteMeta = remoteMeta;
      return remoteFunctionDetails;
    } catch (error) {
      console.error('ERROR loading remote databox pricing', remoteMeta, error);
      throw error;
    }
  }

  private async findDataboxMeta(): Promise<IFetchMetaResponseData> {
    const entrypoint = `${this.dbx.workingDirectory}/databox.js`;
    const databoxProcess = new LocalDataboxProcess(entrypoint);
    const meta = await databoxProcess.fetchMeta();
    await new Promise(resolve => setTimeout(resolve, 1e3));
    await databoxProcess.close();
    return meta;
  }
}
