import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManifest';
import { existsAsync, readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';

export default class DataboxManifest implements IDataboxManifest {
  public scriptVersionHash: string;
  public scriptVersionHashToCreatedDate: { [scriptVersionHash: string]: number };
  public scriptEntrypoint: string;
  public runtimeName: string;
  public runtimeVersion: string;
  public versionTimestamp: number;

  public readonly path: string;

  constructor(manifestPath: string) {
    this.path = manifestPath;
  }

  public async exists(): Promise<boolean> {
    return await existsAsync(this.path);
  }

  public async rebase(versionHistory: { [scriptVersionHash: string]: number }): Promise<void> {
    Object.assign(this.scriptVersionHashToCreatedDate, versionHistory);
    this.addScriptHashToHistory();
    await this.save();
  }

  public async update(
    versionTimestamp: number,
    updates: Omit<IDataboxManifest, 'scriptVersionHashToCreatedDate'>,
  ): Promise<void> {
    await this.load();

    Object.assign(this, updates);

    this.scriptVersionHashToCreatedDate ??= {};
    this.addScriptHashToHistory();
    await this.save();
  }

  public async load(): Promise<void> {
    if (await this.exists()) {
      const data = await readFileAsJson(this.path);
      if (data) Object.assign(this, data);
    }
  }

  public async save(): Promise<void> {
    await safeOverwriteFile(this.path, JSON.stringify(this.toJSON(), null, 2));
  }

  public toJSON(): IDataboxManifest {
    return {
      scriptVersionHash: this.scriptVersionHash,
      scriptVersionHashToCreatedDate: this.scriptVersionHashToCreatedDate,
      scriptEntrypoint: this.scriptEntrypoint,
      runtimeName: this.runtimeName,
      runtimeVersion: this.runtimeVersion,
    };
  }

  private addScriptHashToHistory(): void {
    this.versionTimestamp ??= Date.now();
    this.scriptVersionHashToCreatedDate[this.scriptVersionHash] ??= this.versionTimestamp;
    const history = Object.entries(this.scriptVersionHashToCreatedDate);
    history.sort((a, b) => b[1] - a[1]);
    // @ts-ignore
    const result = Object.fromEntries(history);

    this.scriptVersionHashToCreatedDate = result;
  }
}
