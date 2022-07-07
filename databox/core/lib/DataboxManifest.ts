import * as Hasher from '@ulixee/commons/lib/Hasher';
import IDataboxManifest, {
  IVersionHistoryEntry,
} from '@ulixee/databox-interfaces/IDataboxManifest';
import { existsAsync, readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import * as Path from 'path';
import UlixeeConfig from '@ulixee/commons/config';
import { findProjectPathSync } from '@ulixee/commons/lib/dirUtils';
import { assert } from '@ulixee/commons/lib/utils';
import { promises as Fs } from 'fs';

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
  public source: 'default' | 'entrypoint' | 'project' | 'global';

  public readonly path: string;

  #customSources: [
    global: DataboxManifest,
    project?: DataboxManifest,
    entrypoint?: DataboxManifest,
  ];

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

  public async setLinkedVersions(linkedVersions: IVersionHistoryEntry[]): Promise<void> {
    this.linkedVersions = linkedVersions;
    this.computeVersionHash();
    await this.save();
    await this.syncOverrideManifestVersions();
  }

  public async update(
    scriptHash: string,
    scriptEntrypoint: string,
    versionTimestamp: number,
    runtimeName: string,
    runtimeVersion: string,
    logger?: (message: string, ...args: any[]) => any,
  ): Promise<void> {
    await this.load();
    this.linkedVersions ??= [];
    this.runtimeName = runtimeName;
    this.runtimeVersion = runtimeVersion;
    this.scriptEntrypoint = scriptEntrypoint;
    // allow manifest to override above values
    await this.loadManifestOverrides(logger);

    if (this.versionHash && !this.hasClearedLinkedVersions) {
      this.addVersionHashToHistory();
    }
    this.versionTimestamp = versionTimestamp;
    this.scriptHash = scriptHash;
    await this.computeVersionHash();

    await this.save();
    await this.syncOverrideManifestVersions();
  }

  public computeVersionHash(): void {
    this.versionHash = DataboxManifest.createVersionHash(this);
  }

  public async load(): Promise<boolean> {
    if (await this.exists()) {
      let data: IDataboxManifest = (await readFileAsJson(this.path)) ?? {} as any;
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
    const data = this.toJSON();
    let json = data as any;

    if (this.source === 'global' || this.source === 'project') {
      const config = (await readFileAsJson(this.path)) ?? {};
      config[this.sharedConfigFileKey] = { ...data, allVersions: this.allVersions };
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
      scriptHash: this.scriptHash,
      versionHash: this.versionHash,
      versionTimestamp: this.versionTimestamp,
      linkedVersions: this.linkedVersions,
      scriptEntrypoint: this.scriptEntrypoint,
      runtimeName: this.runtimeName,
      runtimeVersion: this.runtimeVersion,
    };
  }

  private getAbsoluteScriptPath(): string {
    if (this.source !== 'default') {
      throw new Error('getAbsoluteScriptPath() can only be called from the default source');
    }

    const projectPath = findProjectPathSync(this.path);
    return Path.resolve(projectPath, '..', this.scriptEntrypoint);
  }

  private getAbsoluteManifestPath(): string {
    const scriptPath = this.getAbsoluteScriptPath();
    return scriptPath.replace(Path.extname(scriptPath), '-manifest.json');
  }

  private loadEntrypointManifest(): DataboxManifest {
    const manifestPath = this.getAbsoluteManifestPath();
    return new DataboxManifest(manifestPath, 'entrypoint');
  }

  private loadProjectManifest(): DataboxManifest {
    const manifestPath = this.getAbsoluteManifestPath();
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

  private loadGlobalManifest(): DataboxManifest {
    const path = Path.join(UlixeeConfig.global.directoryPath, 'databoxes.json');
    const manifestPath = this.getAbsoluteManifestPath();
    return new DataboxManifest(path, 'global', manifestPath);
  }

  private getCustomSources(): DataboxManifest[] {
    this.#customSources ??= [
      this.loadGlobalManifest(),
      this.loadProjectManifest(),
      this.loadEntrypointManifest(),
    ];
    return this.#customSources;
  }

  private async syncOverrideManifestVersions(): Promise<void> {
    for (const source of this.getCustomSources()) {
      if (!source || !(await source.exists())) continue;
      source.allVersions ??= [];
      if (!source.allVersions.some(x => x.versionHash === this.versionHash)) {
        source.allVersions.unshift({
          versionHash: this.versionHash,
          versionTimestamp: this.versionTimestamp,
        });
      }
      if (source.linkedVersions) {
        source.linkedVersions = [...this.linkedVersions];
      }
      await source.save();
    }
  }

  private async loadManifestOverrides(
    logger?: (message: string, ...args: any[]) => any,
  ): Promise<void> {
    for (const source of this.getCustomSources()) {
      if (!source) continue;
      const didLoad = await source.load();
      if (didLoad) {
        const overrides = filterUndefined(source.toJSON());
        if (!Object.keys(overrides).length) continue;
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
}

function filterUndefined<T>(object: T): Partial<T> {
  if (!object) return object;
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}
