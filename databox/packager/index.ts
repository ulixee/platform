import { existsSync, promises as Fs } from 'fs';
import * as Path from 'path';
import * as Hasher from '@ulixee/commons/lib/Hasher';
import LocalDataboxProcess from '@ulixee/databox-core/lib/LocalDataboxProcess';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import rollupDatabox from './lib/rollupDatabox';
import DbxFile from './lib/DbxFile';
import DataboxManifest from './lib/DataboxManifest';

export default class DataboxPackager {
  public manifest: DataboxManifest;
  public script: string;
  public sourceMap: string;

  public get dbxPath(): string {
    return `${Path.dirname(this.entrypoint)}${Path.sep}${this.filename}.dbx`;
  }

  private readonly workingDirectory: string;
  private readonly entrypoint: string;
  private readonly filename: string;

  constructor(entrypoint: string) {
    this.entrypoint = Path.resolve(entrypoint);
    const entrypointName = Path.basename(this.entrypoint);
    this.filename = entrypointName.replace(Path.extname(entrypointName), '');
    this.workingDirectory = `${this.dbxPath}.build`;
    this.manifest = new DataboxManifest(`${this.workingDirectory}/databox-manifest.json`);
  }

  public async build(options?: {
    tsconfig?: string;
    compiledSourcePath?: string;
    keepOpen?: boolean;
  }): Promise<DbxFile> {
    const dbx = new DbxFile(this.dbxPath);
    if ((await dbx.exists()) && !(await dbx.isOpen())) {
      await dbx.open(true);
    }
    const sourceManifest = Path.join(
      Path.dirname(this.entrypoint),
      this.filename,
      '-manifest.json',
    );
    if (await existsAsync(sourceManifest)) {
      await Fs.copyFile(sourceManifest, this.manifest.path);
    }

    const { sourceCode, sourceMap } = await this.rollup(options);

    await this.createOrUpdateManifest(sourceCode, sourceMap);
    await dbx.save(options?.keepOpen);

    return dbx;
  }

  public async rollup(options?: {
    tsconfig?: string;
    compiledSourcePath?: string;
  }): Promise<{ sourceMap: string; sourceCode: string }> {
    const rollup = await rollupDatabox(options?.compiledSourcePath ?? this.entrypoint, {
      outDir: this.workingDirectory,
      tsconfig: options?.tsconfig,
    });
    return { sourceMap: rollup.sourceMap, sourceCode: rollup.code.toString('utf8') };
  }

  public async createOrUpdateManifest(
    sourceCode: string,
    sourceMap: string,
  ): Promise<DataboxManifest> {
    const runtime = await this.findDataboxRuntime();
    const relativeScriptPath = this.findRelativeScriptPath();
    if (!runtime || !runtime.name) {
      throw new Error('The exported databox object must specify a runtime');
    }
    if (!runtime.version) {
      throw new Error('The databox does not specify a runtime version');
    }

    const scriptVersionHash = Hasher.hashDatabox(Buffer.from(sourceCode));
    await this.manifest.update(Date.now(), {
      scriptEntrypoint: relativeScriptPath,
      scriptVersionHash,
      runtimeName: runtime.name,
      runtimeVersion: runtime.version,
    });
    this.script = sourceCode;
    this.sourceMap = sourceMap;
    return this.manifest;
  }

  private async findDataboxRuntime(): Promise<{ name: string; version: string }> {
    const entrypoint = `${this.workingDirectory}/databox.js`;
    const databoxProcess = new LocalDataboxProcess(entrypoint);
    const runtime = await databoxProcess.fetchRuntime();
    await new Promise(resolve => setTimeout(resolve, 1e3));
    await databoxProcess.close();
    return runtime;
  }

  private findRelativeScriptPath(): string {
    const projectPath = Path.resolve(DataboxPackager.findProjectPath(this.entrypoint));
    return Path.relative(`${projectPath}/..`, this.entrypoint);
  }

  public static findProjectPath(entrypoint: string): string {
    let last: string;
    let path = Path.resolve(entrypoint);
    do {
      last = path;
      if (existsSync(Path.join(path, 'package.json'))) {
        return path;
      }
      path = Path.dirname(path);
    } while (path && path !== last);
  }
}
