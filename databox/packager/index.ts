import * as Path from 'path';
import * as Hasher from '@ulixee/commons/lib/Hasher';
import LocalDataboxProcess from '@ulixee/databox-core/lib/LocalDataboxProcess';
import DataboxManifest from '@ulixee/databox-core/lib/DataboxManifest';
import UlixeeConfig from '@ulixee/commons/config';
import rollupDatabox from './lib/rollupDatabox';
import DbxFile from './lib/DbxFile';

export default class DataboxPackager {
  public manifest: DataboxManifest;
  public script: string;
  public sourceMap: string;
  public dbx: DbxFile;

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
    const runtime = await this.findDataboxRuntime();
    if (!runtime || !runtime.name) {
      throw new Error('The exported Databox object must specify a runtime');
    }
    if (!runtime.version) {
      throw new Error('The Databox does not specify a runtime version');
    }

    const scriptVersionHash = Hasher.hash(Buffer.from(sourceCode), 'scr');
    await this.manifest.update(
      this.entrypoint,
      scriptVersionHash,
      Date.now(),
      runtime.name,
      runtime.version,
      this.logToConsole ? console.log : undefined,
    );
    if (createNewVersionHistory) {
      await this.manifest.setLinkedVersions(this.entrypoint, []);
    }
    this.script = sourceCode;
    this.sourceMap = sourceMap;
    return this.manifest;
  }

  private async findDataboxRuntime(): Promise<{ name: string; version: string }> {
    const entrypoint = `${this.dbx.workingDirectory}/databox.js`;
    const databoxProcess = new LocalDataboxProcess(entrypoint);
    const runtime = await databoxProcess.fetchRuntime();
    await new Promise(resolve => setTimeout(resolve, 1e3));
    await databoxProcess.close();
    return runtime;
  }
}
