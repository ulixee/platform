import UlixeeConfig from '@ulixee/commons/config';
import { concatAsBuffer, encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import { findProjectPathAsync, getDataDirectory } from '@ulixee/commons/lib/dirUtils';
import { existsAsync, readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import * as HashUtils from '@ulixee/commons/lib/hashUtils';
import { filterUndefined } from '@ulixee/commons/lib/objectUtils';
import { assert } from '@ulixee/commons/lib/utils';
import IDatastoreMetadata from '@ulixee/datastore/interfaces/IDatastoreMetadata';
import IDatastoreManifest, {
  DatastoreManifestSchema,
  IVersionHistoryEntry,
} from '@ulixee/platform-specification/types/IDatastoreManifest';
import { datastoreVersionHashValidation } from '@ulixee/platform-specification/types/datastoreVersionHashValidation';
import ValidationError from '@ulixee/specification/utils/ValidationError';
import { promises as Fs } from 'fs';
import * as Path from 'path';
import env from '../env';

type IDatastoreSources = [
  global: DatastoreManifest,
  project?: DatastoreManifest,
  entrypoint?: DatastoreManifest,
];

export default class DatastoreManifest implements IDatastoreManifest {
  public static TemporaryIdPrefix = `dbx1startedtempver`;
  public name: string;
  public description: string;
  public domain: string;
  public versionHash: string;
  public versionTimestamp: number;
  public scriptHash: string;
  public scriptEntrypoint: string;
  public storageEngineHost: string;

  public coreVersion: string;
  public schemaInterface: string;
  public crawlersByName: IDatastoreManifest['crawlersByName'] = {};
  public extractorsByName: IDatastoreManifest['extractorsByName'] = {};
  public tablesByName: IDatastoreManifest['tablesByName'] = {};

  public adminIdentities: string[];
  // Payment details
  public paymentAddress?: string;

  public linkedVersions: IVersionHistoryEntry[];
  public allVersions: IVersionHistoryEntry[];
  public hasClearedLinkedVersions = false;
  public addToVersionHistory = true;

  public explicitSettings: Partial<IDatastoreManifest>;
  public source: 'dbx' | 'entrypoint' | 'project' | 'global';

  public readonly path: string;

  constructor(
    manifestPath: string,
    source: (typeof DatastoreManifest.prototype)['source'] = 'dbx',
    private sharedConfigFileKey?: string,
  ) {
    this.path = manifestPath;
    this.source = source;
    if (source === 'global' || source === 'project') {
      assert(
        sharedConfigFileKey,
        'A sharedConfigFileKey must be specified for a Project or Global Datastore Manifests',
      );
    }
  }

  public async exists(): Promise<boolean> {
    return await existsAsync(this.path);
  }

  public async setLinkedVersions(
    absoluteScriptEntrypoint: string,
    linkedVersions: IVersionHistoryEntry[],
  ): Promise<void> {
    this.linkedVersions = linkedVersions;
    this.computeVersionHash();
    await this.save();
    const manifestSources = DatastoreManifest.getCustomSources(absoluteScriptEntrypoint);
    await this.syncGeneratedManifests(manifestSources);
  }

  public async update(
    absoluteScriptEntrypoint: string,
    scriptHash: string,
    versionTimestamp: number,
    schemaInterface: string,
    extractorsByName: IDatastoreManifest['extractorsByName'],
    crawlersByName: IDatastoreManifest['crawlersByName'],
    tablesByName: IDatastoreManifest['tablesByName'],
    metadata: Pick<
      IDatastoreMetadata,
      | 'coreVersion'
      | 'paymentAddress'
      | 'adminIdentities'
      | 'domain'
      | 'name'
      | 'description'
      | 'storageEngineHost'
    >,
    logger?: (message: string, ...args: any[]) => any,
    createTemporaryVersionHash = false,
  ): Promise<void> {
    await this.load();

    const projectPath = Path.resolve(await findProjectPathAsync(absoluteScriptEntrypoint));
    const scriptEntrypoint = Path.relative(`${projectPath}/..`, absoluteScriptEntrypoint);

    const manifestSources = DatastoreManifest.getCustomSources(absoluteScriptEntrypoint);
    await this.loadGeneratedManifests(manifestSources);
    this.linkedVersions ??= [];
    this.extractorsByName = {};
    this.crawlersByName = {};

    const {
      name,
      description,
      coreVersion,
      paymentAddress,
      adminIdentities,
      domain,
      storageEngineHost,
    } = metadata;

    Object.assign(
      this,
      filterUndefined({
        coreVersion,
        schemaInterface,
        paymentAddress,
        adminIdentities,
        domain,
        description,
        name,
        storageEngineHost,
      }),
    );
    this.adminIdentities ??= [];

    for (const [funcName, funcMeta] of Object.entries(extractorsByName)) {
      this.extractorsByName[funcName] = {
        description: funcMeta.description,
        corePlugins: funcMeta.corePlugins ?? {},
        prices: funcMeta.prices ?? [{ perQuery: 0, minimum: 0 }],
        schemaAsJson: funcMeta.schemaAsJson,
      };
    }
    for (const [funcName, funcMeta] of Object.entries(crawlersByName)) {
      this.crawlersByName[funcName] = {
        description: funcMeta.description,
        corePlugins: funcMeta.corePlugins ?? {},
        prices: funcMeta.prices ?? [{ perQuery: 0, minimum: 0 }],
        schemaAsJson: funcMeta.schemaAsJson,
      };
    }
    for (const [tableName, tableMeta] of Object.entries(tablesByName)) {
      this.tablesByName[tableName] = {
        description: tableMeta.description,
        prices: tableMeta.prices ?? [{ perQuery: 0 }],
        schemaAsJson: tableMeta.schemaAsJson,
      };
    }
    // allow manifest to override above values
    await this.loadExplicitSettings(manifestSources, logger);

    if (this.versionHash && !this.hasClearedLinkedVersions) {
      this.addVersionHashToHistory();
    }
    this.scriptEntrypoint = scriptEntrypoint;
    this.versionTimestamp = versionTimestamp;
    this.scriptHash = scriptHash;
    if (createTemporaryVersionHash) {
      const tempVersionHashPath = Path.join(
        getDataDirectory(),
        'ulixee',
        'datastore-temp-ids.json',
      );
      // DBX validation: [ac-hj-np-z02-9]{18}
      const tempVersions = (await readFileAsJson(tempVersionHashPath).catch(() => {})) ?? {};
      if (!tempVersions[this.scriptEntrypoint]) {
        const next = Object.keys(tempVersions).length + 1;
        tempVersions[this.scriptEntrypoint] = String(next).replace(/1/g, 'l').padStart(4, '0');
        await Fs.writeFile(tempVersionHashPath, JSON.stringify(tempVersions, null, 2));
      }

      this.versionHash = `${DatastoreManifest.TemporaryIdPrefix}${
        tempVersions[this.scriptEntrypoint]
      }`;
    } else {
      await this.computeVersionHash();
    }
    await this.save();
    await this.syncGeneratedManifests(manifestSources);
  }

  public computeVersionHash(): void {
    this.versionHash = DatastoreManifest.createVersionHash(this);
  }

  public async load(): Promise<boolean> {
    if (await this.exists()) {
      let data: IDatastoreManifestJson = (await readFileAsJson(this.path)) ?? ({} as any);
      // Dbx manifest is just a raw manifest (no manual settings or history
      if (data && this.source === 'dbx') {
        Object.assign(this, filterUndefined(data));
        return true;
      }
      // Global/Project configs store under a key
      if (this.source === 'global' || this.source === 'project') {
        data = data[this.sharedConfigFileKey];
      }
      if (data) {
        const {
          __GENERATED_LAST_VERSION__: generated,
          __VERSION_HISTORY__: allVersions,
          ...explicitSettings
        } = data;
        this.explicitSettings = filterUndefined(explicitSettings);
        Object.assign(this, filterUndefined(generated));
        if (allVersions) this.allVersions = allVersions;

        return true;
      }
    } else if (this.source === 'global') {
      await safeOverwriteFile(this.path, '{}');
      this.allVersions = [];
    }
    return false;
  }

  public async save(): Promise<void> {
    let json: any;
    if (this.source === 'global' || this.source === 'project') {
      if (!env.enableGlobalConfigs) return;

      const config = (await readFileAsJson(this.path)) ?? {};
      config[this.sharedConfigFileKey] = this.toConfigManifest();
      json = config;
    } else if (this.source === 'entrypoint') {
      json = this.toConfigManifest();
    } else if (this.source === 'dbx') {
      // dbx stores only the output
      json = this.toJSON();
      await DatastoreManifest.validate(json);
    }

    // don't create file if it doesn't exist already
    if (this.source !== 'dbx' && !(await this.exists())) {
      return;
    }
    await DatastoreManifest.writeToDisk(this.path, json);
  }

  public toConfigManifest(): IDatastoreManifestJson {
    return {
      ...this.explicitSettings,
      __GENERATED_LAST_VERSION__: this.toJSON(),
      __VERSION_HISTORY__: this.allVersions,
    };
  }

  public toJSON(): IDatastoreManifest {
    return {
      name: this.name,
      description: this.description,
      domain: this.domain,
      versionHash: this.versionHash,
      versionTimestamp: this.versionTimestamp,
      linkedVersions: this.linkedVersions,
      scriptEntrypoint: this.scriptEntrypoint,
      scriptHash: this.scriptHash,
      coreVersion: this.coreVersion,
      schemaInterface: this.schemaInterface,
      extractorsByName: this.extractorsByName,
      crawlersByName: this.crawlersByName,
      storageEngineHost: this.storageEngineHost,
      tablesByName: this.tablesByName,
      paymentAddress: this.paymentAddress,
      adminIdentities: this.adminIdentities,
    };
  }

  private async syncGeneratedManifests(sources: IDatastoreSources): Promise<void> {
    for (const source of sources) {
      if (!source || !(await source.exists())) continue;
      source.allVersions ??= [];
      if (!source.allVersions.some(x => x.versionHash === this.versionHash)) {
        source.allVersions.unshift({
          versionHash: this.versionHash,
          versionTimestamp: this.versionTimestamp,
        });
      }
      Object.assign(source, this.toJSON());
      await source.save();
    }
  }

  private async loadGeneratedManifests(sources: IDatastoreSources): Promise<void> {
    for (const source of sources) {
      if (!source) continue;
      const didLoad = await source.load();
      if (didLoad) {
        const data = filterUndefined(source.toJSON());
        if (!Object.keys(data).length) continue;
        Object.assign(this, data);
      }
    }
  }

  private async loadExplicitSettings(
    sources: IDatastoreSources,
    logger?: (message: string, ...args: any[]) => any,
  ): Promise<void> {
    for (const source of sources) {
      if (!source) continue;
      const didLoad = await source.load();
      if (didLoad) {
        const explicitSettings = filterUndefined(source.explicitSettings);
        if (!explicitSettings || !Object.keys(explicitSettings).length) continue;
        logger?.('Applying Datastore Manifest overrides', {
          source: source.source,
          path: source.path,
          overrides: explicitSettings,
        });
        const { extractorsByName, crawlersByName, tablesByName, ...otherSettings } =
          explicitSettings;
        if (extractorsByName) {
          for (const [name, funcMeta] of Object.entries(extractorsByName)) {
            if (this.extractorsByName[name]) {
              Object.assign(this.extractorsByName[name], funcMeta);
            } else {
              this.extractorsByName[name] = funcMeta;
            }
            this.extractorsByName[name].prices ??= [];
            for (const price of this.extractorsByName[name].prices) {
              price.perQuery ??= 0;
              price.minimum ??= price.perQuery;
            }
          }
        }
        if (crawlersByName) {
          for (const [name, funcMeta] of Object.entries(crawlersByName)) {
            if (this.crawlersByName[name]) {
              Object.assign(this.crawlersByName[name], funcMeta);
            } else {
              this.crawlersByName[name] = funcMeta;
            }
            this.crawlersByName[name].prices ??= [];
            for (const price of this.crawlersByName[name].prices) {
              price.perQuery ??= 0;
              price.minimum ??= price.perQuery;
            }
          }
        }
        if (tablesByName) {
          for (const [name, meta] of Object.entries(tablesByName)) {
            if (this.tablesByName[name]) {
              Object.assign(this.tablesByName[name], meta);
            } else {
              this.tablesByName[name] = meta;
            }
            this.tablesByName[name].prices ??= [];
            for (const price of this.tablesByName[name].prices) {
              price.perQuery ??= 0;
            }
          }
        }
        Object.assign(this, otherSettings);
        if (explicitSettings.linkedVersions?.length === 0) {
          this.hasClearedLinkedVersions = true;
        }
      }
    }
    // only cleared if explicitly cleared and also not re-set at a different layer
    this.hasClearedLinkedVersions &&= this.linkedVersions.length === 0;
  }

  private addVersionHashToHistory(): void {
    if (
      this.addToVersionHistory &&
      this.versionHash &&
      !this.versionHash.includes('tempver') &&
      !this.linkedVersions.some(x => x.versionHash === this.versionHash)
    ) {
      this.linkedVersions.unshift({
        versionHash: this.versionHash,
        versionTimestamp: this.versionTimestamp,
      });
      this.linkedVersions.sort((a, b) => b.versionTimestamp - a.versionTimestamp);
    }
  }

  public static createVersionHash(
    manifest: Pick<
      IDatastoreManifest,
      | 'scriptHash'
      | 'storageEngineHost'
      | 'versionTimestamp'
      | 'scriptEntrypoint'
      | 'linkedVersions'
      | 'paymentAddress'
      | 'extractorsByName'
      | 'crawlersByName'
      | 'tablesByName'
      | 'adminIdentities'
    >,
  ): string {
    const {
      scriptHash,
      versionTimestamp,
      scriptEntrypoint,
      extractorsByName,
      crawlersByName,
      tablesByName,
      paymentAddress,
      linkedVersions,
      storageEngineHost,
      adminIdentities,
    } = manifest;
    linkedVersions.sort((a, b) => b.versionTimestamp - a.versionTimestamp);
    const extractors = Object.keys(extractorsByName ?? {}).sort();
    const extractorPrices: (string | number)[] = [];
    for (const name of extractors) {
      const func = extractorsByName[name];
      func.prices ??= [{ perQuery: 0, minimum: 0 }];
      for (const price of func.prices) {
        extractorPrices.push(price.perQuery, price.minimum, price.addOns?.perKb);
      }
    }
    const crawlerPrices: (string | number)[] = [];
    for (const name of Object.keys(crawlersByName ?? {}).sort()) {
      const func = crawlersByName[name];
      func.prices ??= [{ perQuery: 0, minimum: 0 }];
      for (const price of func.prices) {
        crawlerPrices.push(price.perQuery, price.minimum, price.addOns?.perKb);
      }
    }
    const tablePrices: (string | number)[] = [];
    for (const name of Object.keys(tablesByName ?? {}).sort()) {
      const table = tablesByName[name];
      table.prices ??= [{ perQuery: 0 }];
      for (const price of table.prices) {
        tablePrices.push(price.perQuery);
      }
    }
    const hashMessage = concatAsBuffer(
      scriptHash,
      versionTimestamp,
      scriptEntrypoint,
      storageEngineHost,
      ...extractorPrices,
      ...crawlerPrices,
      ...tablePrices,
      paymentAddress,
      ...(adminIdentities ?? []),
      JSON.stringify(linkedVersions),
    );
    const sha = HashUtils.sha256(hashMessage);
    return encodeBuffer(sha, 'dbx').substring(0, 22);
  }

  public static validate(json: IDatastoreManifest): void {
    try {
      DatastoreManifestSchema.parse(json);
    } catch (error) {
      console.error('Error validating DatastoreManifest', error);
      throw ValidationError.fromZodValidation(
        'This Manifest has errors that need to be fixed.',
        error,
      );
    }
  }

  public static validateVersionHash(versionHash: string): void {
    try {
      datastoreVersionHashValidation.parse(versionHash);
    } catch (error) {
      throw ValidationError.fromZodValidation('This is not a valid datastore versionHash', error);
    }
  }

  /// MANIFEST OVERRIDE FILES  /////////////////////////////////////////////////////////////////////////////////////////

  private static getCustomSources(absoluteScriptEntrypoint: string): IDatastoreSources {
    const manifestPath = absoluteScriptEntrypoint.replace(
      Path.extname(absoluteScriptEntrypoint),
      '-manifest.json',
    );
    return [
      this.loadGlobalManifest(manifestPath),
      this.loadProjectManifest(manifestPath),
      this.loadEntrypointManifest(manifestPath),
    ];
  }

  private static loadEntrypointManifest(manifestPath: string): DatastoreManifest {
    return new DatastoreManifest(manifestPath, 'entrypoint');
  }

  private static loadProjectManifest(manifestPath: string): DatastoreManifest {
    const path = UlixeeConfig.findConfigDirectory(
      {
        entrypoint: manifestPath,
        workingDirectory: manifestPath,
      },
      false,
    );
    if (!path) return null;
    return new DatastoreManifest(
      Path.join(path, 'datastores.json'),
      'project',
      Path.relative(path, manifestPath),
    );
  }

  private static loadGlobalManifest(manifestPath: string): DatastoreManifest {
    const path = Path.join(UlixeeConfig.global.directoryPath, 'datastores.json');
    return new DatastoreManifest(path, 'global', manifestPath);
  }

  private static async writeToDisk(path: string, json: any): Promise<void> {
    if (!(await existsAsync(Path.dirname(path)))) {
      await Fs.mkdir(Path.dirname(path), { recursive: true });
    }
    await safeOverwriteFile(path, JSON.stringify(json, null, 2));
  }
}

interface IDatastoreManifestJson extends Partial<IDatastoreManifest> {
  __GENERATED_LAST_VERSION__: IDatastoreManifest;
  __VERSION_HISTORY__: IVersionHistoryEntry[];
}
