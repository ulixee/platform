import * as HashUtils from '@ulixee/commons/lib/hashUtils';
import IDataboxManifest, {
  DataboxManifestSchema,
  IVersionHistoryEntry,
} from '@ulixee/specification/types/IDataboxManifest';
import { existsAsync, readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import * as Path from 'path';
import UlixeeConfig from '@ulixee/commons/config';
import { findProjectPathAsync } from '@ulixee/commons/lib/dirUtils';
import { assert } from '@ulixee/commons/lib/utils';
import { promises as Fs } from 'fs';
import { concatAsBuffer, encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import ValidationError from '@ulixee/specification/utils/ValidationError';
import { filterUndefined } from '@ulixee/commons/lib/objectUtils';

type IDataboxSources = [
  global: DataboxManifest,
  project?: DataboxManifest,
  entrypoint?: DataboxManifest,
];

export default class DataboxManifest implements IDataboxManifest {
  public versionHash: string;
  public versionTimestamp: number;
  public scriptHash: string;
  public scriptEntrypoint: string;
  public coreVersion: string;
  public corePlugins: { [name: string]: string };
  public schemaInterface: string;

  // Payment details
  public pricePerQuery?: number;
  public paymentAddress?: string;
  public giftCardIssuerIdentity?: string;

  public linkedVersions: IVersionHistoryEntry[];
  public allVersions: IVersionHistoryEntry[];
  public hasClearedLinkedVersions = false;

  public explicitSettings: Partial<IDataboxManifest>;
  public source: 'dbx' | 'entrypoint' | 'project' | 'global';

  public readonly path: string;

  constructor(
    manifestPath: string,
    source: typeof DataboxManifest.prototype['source'] = 'dbx',
    private sharedConfigFileKey?: string,
  ) {
    this.path = manifestPath;
    this.source = source;
    if (source === 'global' || source === 'project') {
      assert(
        sharedConfigFileKey,
        'A sharedConfigFileKey must be specified for a Project or Global Databox Manifests',
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
    const manifestSources = DataboxManifest.getCustomSources(absoluteScriptEntrypoint);
    await this.syncGeneratedManifests(manifestSources);
  }

  public async update(
    absoluteScriptEntrypoint: string,
    scriptHash: string,
    versionTimestamp: number,
    coreVersion: string,
    corePlugins: { [name: string]: string },
    schemaInterface: string | undefined,
    logger?: (message: string, ...args: any[]) => any,
  ): Promise<void> {
    await this.load();

    const projectPath = Path.resolve(await findProjectPathAsync(absoluteScriptEntrypoint));
    const scriptEntrypoint = Path.relative(`${projectPath}/..`, absoluteScriptEntrypoint);

    const manifestSources = DataboxManifest.getCustomSources(absoluteScriptEntrypoint);
    await this.loadGeneratedManifests(manifestSources);
    this.linkedVersions ??= [];
    this.coreVersion = coreVersion;
    this.corePlugins = corePlugins;
    this.schemaInterface = schemaInterface;
    // allow manifest to override above values
    await this.loadExplicitSettings(manifestSources, logger);

    if (this.versionHash && !this.hasClearedLinkedVersions) {
      this.addVersionHashToHistory();
    }
    this.scriptEntrypoint = scriptEntrypoint;
    this.versionTimestamp = versionTimestamp;
    this.scriptHash = scriptHash;
    await this.computeVersionHash();
    await this.save();
    await this.syncGeneratedManifests(manifestSources);
  }

  public computeVersionHash(): void {
    this.versionHash = DataboxManifest.createVersionHash(this);
  }

  public async load(): Promise<boolean> {
    if (await this.exists()) {
      let data: IDataboxManifestJson = (await readFileAsJson(this.path)) ?? ({} as any);
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
      const config = (await readFileAsJson(this.path)) ?? {};
      config[this.sharedConfigFileKey] = this.toConfigManifest();
      json = config;
    } else if (this.source === 'entrypoint') {
      json = this.toConfigManifest();
    } else if (this.source === 'dbx') {
      // dbx stores only the output
      json = this.toJSON();
      await DataboxManifest.validate(json);
    }

    // don't create file if it doesn't exist already
    if (this.source !== 'dbx' && !(await this.exists())) {
      return;
    }
    if (!(await existsAsync(Path.dirname(this.path)))) {
      await Fs.mkdir(Path.dirname(this.path), { recursive: true });
    }
    await safeOverwriteFile(this.path, JSON.stringify(json, null, 2));
  }

  public toConfigManifest(): IDataboxManifestJson {
    return {
      ...this.explicitSettings,
      __GENERATED_LAST_VERSION__: this.toJSON(),
      __VERSION_HISTORY__: this.allVersions,
    };
  }

  public toJSON(): IDataboxManifest {
    return {
      versionHash: this.versionHash,
      versionTimestamp: this.versionTimestamp,
      linkedVersions: this.linkedVersions,
      scriptEntrypoint: this.scriptEntrypoint,
      scriptHash: this.scriptHash,
      coreVersion: this.coreVersion,
      corePlugins: this.corePlugins,
      paymentAddress: this.paymentAddress,
      giftCardIssuerIdentity: this.giftCardIssuerIdentity,
      pricePerQuery: this.pricePerQuery,
      schemaInterface: this.schemaInterface,
    };
  }

  private async syncGeneratedManifests(sources: IDataboxSources): Promise<void> {
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

  private async loadGeneratedManifests(sources: IDataboxSources): Promise<void> {
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
    sources: IDataboxSources,
    logger?: (message: string, ...args: any[]) => any,
  ): Promise<void> {
    for (const source of sources) {
      if (!source) continue;
      const didLoad = await source.load();
      if (didLoad) {
        const explicitSettings = filterUndefined(source.explicitSettings);
        if (!explicitSettings || !Object.keys(explicitSettings).length) continue;
        logger?.('Applying Databox Manifest overrides', {
          source: source.source,
          path: source.path,
          overrides: explicitSettings,
        });
        Object.assign(this, explicitSettings);
        if (explicitSettings.linkedVersions?.length === 0) {
          this.hasClearedLinkedVersions = true;
        }
      }
    }
    // only cleared if explicitly cleared and also not re-set at a different layer
    this.hasClearedLinkedVersions &&= this.linkedVersions.length === 0;
  }

  private addVersionHashToHistory(): void {
    if (this.versionHash && !this.linkedVersions.some(x => x.versionHash === this.versionHash)) {
      this.linkedVersions.unshift({
        versionHash: this.versionHash,
        versionTimestamp: this.versionTimestamp,
      });
      this.linkedVersions.sort((a, b) => b.versionTimestamp - a.versionTimestamp);
    }
  }

  public static createVersionHash(
    manifest: Pick<
      IDataboxManifest,
      | 'scriptHash'
      | 'versionTimestamp'
      | 'scriptEntrypoint'
      | 'linkedVersions'
      | 'paymentAddress'
      | 'giftCardIssuerIdentity'
      | 'pricePerQuery'
    >,
  ): string {
    const {
      scriptHash,
      versionTimestamp,
      scriptEntrypoint,
      pricePerQuery,
      paymentAddress,
      giftCardIssuerIdentity,
      linkedVersions,
    } = manifest;
    linkedVersions.sort((a, b) => b.versionTimestamp - a.versionTimestamp);
    const hashMessage = concatAsBuffer(
      scriptHash,
      versionTimestamp,
      scriptEntrypoint,
      pricePerQuery,
      paymentAddress,
      giftCardIssuerIdentity,
      JSON.stringify(linkedVersions),
    );
    const sha = HashUtils.sha3(hashMessage);
    return encodeBuffer(sha, 'dbx');
  }

  public static validate(json: IDataboxManifest): void {
    try {
      DataboxManifestSchema.parse(json);
    } catch (error) {
      throw ValidationError.fromZodValidation(
        'This Manifest has errors that need to be fixed.',
        error,
      );
    }
  }

  /// MANIFEST OVERRIDE FILES  /////////////////////////////////////////////////////////////////////////////////////////

  private static getCustomSources(absoluteScriptEntrypoint: string): IDataboxSources {
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

  private static loadEntrypointManifest(manifestPath: string): DataboxManifest {
    return new DataboxManifest(manifestPath, 'entrypoint');
  }

  private static loadProjectManifest(manifestPath: string): DataboxManifest {
    const path = UlixeeConfig.findConfigDirectory(
      {
        entrypoint: manifestPath,
        workingDirectory: manifestPath,
      },
      false,
    );
    if (!path) return null;
    return new DataboxManifest(
      Path.join(path, 'databoxes.json'),
      'project',
      Path.relative(path, manifestPath),
    );
  }

  private static loadGlobalManifest(manifestPath: string): DataboxManifest {
    const path = Path.join(UlixeeConfig.global.directoryPath, 'databoxes.json');
    return new DataboxManifest(path, 'global', manifestPath);
  }
}

interface IDataboxManifestJson extends Partial<IDataboxManifest> {
  __GENERATED_LAST_VERSION__: IDataboxManifest;
  __VERSION_HISTORY__: IVersionHistoryEntry[];
}
