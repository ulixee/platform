import * as Hasher from '@ulixee/commons/lib/Hasher';
import IDataboxManifest, {
  IVersionHistoryEntry,
} from '@ulixee/databox-interfaces/IDataboxManifest';
import { existsAsync, readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import * as Path from 'path';
import UlixeeConfig from '@ulixee/commons/config';
import { findProjectPathAsync } from '@ulixee/commons/lib/dirUtils';
import { assert } from '@ulixee/commons/lib/utils';
import { promises as Fs } from 'fs';

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
  public runtimeName: string;
  public runtimeVersion: string;
  public linkedVersions: IVersionHistoryEntry[];
  public allVersions: IVersionHistoryEntry[];
  public hasClearedLinkedVersions = false;
  public overrides?: Partial<IDataboxManifest>;
  public source: 'default' | 'entrypoint' | 'project' | 'global';

  public readonly path: string;

  constructor(
    manifestPath: string,
    source: typeof DataboxManifest.prototype['source'] = 'default',
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
    await this.syncOverrideManifestVersions(manifestSources);
  }

  public async update(
    absoluteScriptEntrypoint: string,
    scriptHash: string,
    versionTimestamp: number,
    runtimeName: string,
    runtimeVersion: string,
    logger?: (message: string, ...args: any[]) => any,
  ): Promise<void> {
    await this.load();

    const projectPath = Path.resolve(await findProjectPathAsync(absoluteScriptEntrypoint));
    const scriptEntrypoint = Path.relative(`${projectPath}/..`, absoluteScriptEntrypoint);

    const manifestSources = DataboxManifest.getCustomSources(absoluteScriptEntrypoint);
    await this.loadManifestSources(manifestSources);
    this.linkedVersions ??= [];
    this.runtimeName = runtimeName;
    this.runtimeVersion = runtimeVersion;
    // allow manifest to override above values
    await this.loadManifestOverrides(manifestSources, logger);

    if (this.versionHash && !this.hasClearedLinkedVersions) {
      this.addVersionHashToHistory();
    }
    this.scriptEntrypoint = scriptEntrypoint;
    this.versionTimestamp = versionTimestamp;
    this.scriptHash = scriptHash;
    await this.computeVersionHash();

    await this.save();
    await this.syncOverrideManifestVersions(manifestSources);
  }

  public computeVersionHash(): void {
    this.versionHash = DataboxManifest.createVersionHash(this);
  }

  public async load(): Promise<boolean> {
    if (await this.exists()) {
      let data: IDataboxManifest = (await readFileAsJson(this.path)) ?? ({} as any);
      if (this.source === 'global' || this.source === 'project') {
        data = filterUndefined(data[this.sharedConfigFileKey]);
      }
      if (data) {
        Object.assign(this, data);
        return true;
      }
    } else if (this.source === 'global') {
      await safeOverwriteFile(this.path, '{}');
      this.allVersions = [];
    }
    return false;
  }

  public async save(): Promise<void> {
    const data: any = this.toJSON();
    let json = data as any;
    if (this.overrides) data.overrides = this.overrides;
    if (this.allVersions) data.allVersions = this.allVersions;

    if (this.source === 'global' || this.source === 'project') {
      const config = (await readFileAsJson(this.path)) ?? {};
      config[this.sharedConfigFileKey] = { ...data };
      json = config;
    }
    // don't create file if it doesn't exist already
    if (this.source !== 'default' && !(await this.exists())) {
      return;
    }
    if (!(await existsAsync(Path.dirname(this.path)))) {
      await Fs.mkdir(Path.dirname(this.path), { recursive: true });
    }
    await safeOverwriteFile(this.path, JSON.stringify(json, null, 2));
  }

  public toJSON(): IDataboxManifest {
    return {
      versionHash: this.versionHash,
      versionTimestamp: this.versionTimestamp,
      linkedVersions: this.linkedVersions,
      scriptEntrypoint: this.scriptEntrypoint,
      scriptHash: this.scriptHash,
      runtimeName: this.runtimeName,
      runtimeVersion: this.runtimeVersion,
    };
  }

  private async syncOverrideManifestVersions(sources: IDataboxSources): Promise<void> {
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

  private async loadManifestSources(sources: IDataboxSources): Promise<void> {
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

  private async loadManifestOverrides(
    sources: IDataboxSources,
    logger?: (message: string, ...args: any[]) => any,
  ): Promise<void> {
    for (const source of sources) {
      if (!source) continue;
      const didLoad = await source.load();
      if (didLoad) {
        const overrides = filterUndefined(source.overrides);
        if (!overrides || !Object.keys(overrides).length) continue;
        logger?.('Applying Databox Manifest overrides', {
          source: source.source,
          path: source.path,
          overrides,
        });
        Object.assign(this, overrides);
        if (overrides.linkedVersions?.length === 0) {
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
      'scriptHash' | 'versionTimestamp' | 'scriptEntrypoint' | 'linkedVersions'
    >,
  ): string {
    const { scriptHash, versionTimestamp, scriptEntrypoint, linkedVersions } = manifest;
    linkedVersions.sort((a, b) => b.versionTimestamp - a.versionTimestamp);
    const hash = `${scriptHash}${versionTimestamp}${scriptEntrypoint}${JSON.stringify(
      linkedVersions,
    )}`;
    return Hasher.hash(Buffer.from(hash), 'dbx');
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

function filterUndefined<T>(object: T): Partial<T> {
  if (!object) return object;
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}
