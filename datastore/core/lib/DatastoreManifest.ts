import UlixeeConfig from '@ulixee/commons/config';
import { findProjectPathAsync } from '@ulixee/commons/lib/dirUtils';
import { existsAsync, readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import { filterUndefined } from '@ulixee/commons/lib/objectUtils';
import { assert } from '@ulixee/commons/lib/utils';
import IDatastoreMetadata from '@ulixee/datastore/interfaces/IDatastoreMetadata';
import { datastoreIdValidation } from '@ulixee/platform-specification/types/datastoreIdValidation';
import IDatastoreManifest, {
  DatastoreManifestSchema,
} from '@ulixee/platform-specification/types/IDatastoreManifest';
import ValidationError from '@ulixee/platform-specification/utils/ValidationError';
import { promises as Fs } from 'fs';
import * as Path from 'path';
import env from '../env';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';

type IDatastoreSources = [
  global: DatastoreManifest,
  project?: DatastoreManifest,
  entrypoint?: DatastoreManifest,
];

export default class DatastoreManifest implements IDatastoreManifest {
  public static TemporaryIdPrefix = 'tmp';
  public id: string;
  public version: string;
  public name: string;
  public description: string;
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

  public domain?: string;

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
      | 'id'
      | 'version'
      | 'coreVersion'
      | 'payment'
      | 'domain'
      | 'adminIdentities'
      | 'name'
      | 'description'
      | 'storageEngineHost'
    >,
    logger?: (message: string, ...args: any[]) => any,
    createTemporaryVersion = false,
  ): Promise<void> {
    await this.load();

    const projectPath = Path.resolve(await findProjectPathAsync(absoluteScriptEntrypoint));
    const scriptEntrypoint = Path.relative(`${projectPath}/..`, absoluteScriptEntrypoint);

    const manifestSources = DatastoreManifest.getCustomSources(absoluteScriptEntrypoint);
    await this.loadGeneratedManifests(manifestSources);
    this.extractorsByName = {};
    this.crawlersByName = {};

    const {
      name,
      description,
      coreVersion,
      payment,
      domain,
      adminIdentities,
      storageEngineHost,
      version,
      id,
    } = metadata;

    Object.assign(
      this,
      filterUndefined({
        coreVersion,
        schemaInterface,
        payment,
        adminIdentities,
        domain,
        description,
        name,
        storageEngineHost,
        version,
        id,
      }),
    );
    this.adminIdentities ??= [];

    for (const [funcName, funcMeta] of Object.entries(extractorsByName)) {
      this.extractorsByName[funcName] = {
        description: funcMeta.description,
        corePlugins: funcMeta.corePlugins ?? {},
        prices: funcMeta.prices ?? [{ basePrice: 0n }],
        schemaAsJson: funcMeta.schemaAsJson,
      };
    }
    for (const [funcName, funcMeta] of Object.entries(crawlersByName)) {
      this.crawlersByName[funcName] = {
        description: funcMeta.description,
        corePlugins: funcMeta.corePlugins ?? {},
        prices: funcMeta.prices ?? [{ basePrice: 0n }],
        schemaAsJson: funcMeta.schemaAsJson,
      };
    }
    for (const [tableName, tableMeta] of Object.entries(tablesByName)) {
      this.tablesByName[tableName] = {
        description: tableMeta.description,
        prices: tableMeta.prices ?? [{ basePrice: 0n }],
        schemaAsJson: tableMeta.schemaAsJson,
      };
    }
    // allow manifest to override above values
    await this.loadExplicitSettings(manifestSources, logger);

    this.scriptEntrypoint = scriptEntrypoint;
    this.versionTimestamp = versionTimestamp;
    this.scriptHash = scriptHash;
    if (createTemporaryVersion) {
      const filename = Path.basename(this.scriptEntrypoint).replace(
        Path.extname(this.scriptEntrypoint),
        '',
      );
      this.id = `${DatastoreManifest.TemporaryIdPrefix}-${filename
        .toLowerCase()
        .replaceAll(/[^a-z0-9-]/g, '-')}`;
      this.version ||= '0.0.1';
    }

    await this.save();
    await this.syncGeneratedManifests(manifestSources);
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
        const { __GENERATED_LAST_VERSION__: generated, ...explicitSettings } = data;
        this.explicitSettings = filterUndefined(explicitSettings);
        Object.assign(this, filterUndefined(generated));

        return true;
      }
    } else if (this.source === 'global') {
      if (!(await existsAsync(Path.dirname(this.path)))) {
        await Fs.mkdir(Path.dirname(this.path), { recursive: true });
      }
      await safeOverwriteFile(this.path, '{}');
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
      DatastoreManifest.validate(json);
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
    };
  }

  public toJSON(): IDatastoreManifest {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      versionTimestamp: this.versionTimestamp,
      scriptEntrypoint: this.scriptEntrypoint,
      scriptHash: this.scriptHash,
      coreVersion: this.coreVersion,
      schemaInterface: this.schemaInterface,
      extractorsByName: this.extractorsByName,
      crawlersByName: this.crawlersByName,
      storageEngineHost: this.storageEngineHost,
      tablesByName: this.tablesByName,
      domain: this.domain,
      adminIdentities: this.adminIdentities,
    };
  }

  private async syncGeneratedManifests(sources: IDatastoreSources): Promise<void> {
    for (const source of sources) {
      if (!source || !(await source.exists())) continue;

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
              price.basePrice ??= 0n;
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
              price.basePrice ??= 0n;
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
              price.basePrice ??= 0n;
            }
          }
        }
        Object.assign(this, otherSettings);
      }
    }
  }

  public static validate(json: IDatastoreManifest): void {
    try {
      DatastoreManifestSchema.parse(json);
    } catch (error) {
      throw ValidationError.fromZodValidation(
        'This Manifest has errors that need to be fixed.',
        error,
      );
    }
  }

  public static validateId(id: string): void {
    try {
      datastoreIdValidation.parse(id);
    } catch (error) {
      throw ValidationError.fromZodValidation('This is not a valid datastore id', error);
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
    await safeOverwriteFile(path, TypeSerializer.stringify(json, { format: true }));
  }
}

interface IDatastoreManifestJson extends Partial<IDatastoreManifest> {
  __GENERATED_LAST_VERSION__: IDatastoreManifest;
}
