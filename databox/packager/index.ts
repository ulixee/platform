import * as Fs from 'fs';
import * as Path from 'path';
import IDataboxPackage from '@ulixee/databox-interfaces/IDataboxPackage';
import { readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManifest';
import * as Hasher from '@ulixee/commons/lib/Hasher';
import LocalDataboxProcess from '@ulixee/databox-core/lib/LocalDataboxProcess';
import IResolvablePromise from '@ulixee/commons/interfaces/IResolvablePromise';
import rollupDatabox from './lib/rollupDatabox';
import ConnectionToDataboxCore from './lib/ConnectionToDataboxCore';

export default class DataboxPackager {
  public package: IDataboxPackage;
  public outputPath: string;
  public databoxModule: string;
  private setupPromise: IResolvablePromise<void>;
  private readonly entrypoint: string;

  constructor(
    entrypoint: string,
    options?: {
      databoxModule?: string;
      outputPath?: string;
    },
  ) {
    this.entrypoint = Path.resolve(entrypoint);
    this.databoxModule = options?.databoxModule;

    if (options?.outputPath) {
      this.outputPath = Path.resolve(options?.outputPath);
      const path = this.outputPath;
      if (Fs.existsSync(path) && !Fs.lstatSync(path).isDirectory()) {
        this.outputPath = Path.dirname(path);
      }
    } else {
      const outputDir = Path.resolve(Path.dirname(this.entrypoint), '.databox');

      const shortScriptName = Path.basename(this.entrypoint)
        .replace(Path.extname(this.entrypoint), '')
        .replace(/[.]/g, '-')
        .toLowerCase();

      this.outputPath = Path.join(outputDir, shortScriptName);
    }
  }

  public async loadPackage(): Promise<void> {
    const manifest = await readFileAsJson<IDataboxManifest>(`${this.outputPath}/manifest.json`);
    const script = await Fs.promises.readFile(`${this.outputPath}/databox.js`, 'utf8');
    const sourceMap = await Fs.promises.readFile(`${this.outputPath}/databox.js.map`, 'utf8');
    this.package = { manifest, script, sourceMap };
  }

  public async build(options?: { tsconfig?: string }): Promise<void> {
    const { sourceCode, sourceMap } = await this.rollup(options);
    await this.createManifest(sourceCode, sourceMap);
  }

  public async rollup(options?: {
    tsconfig?: string;
  }): Promise<{ sourceMap: string; sourceCode: string }> {
    const rollup = await rollupDatabox(this.entrypoint, {
      outDir: this.outputPath,
      tsconfig: options?.tsconfig,
    });
    return { sourceMap: rollup.sourceMap, sourceCode: rollup.code.toString('utf8') };
  }

  public async createManifest(sourceCode: string, sourceMap: string): Promise<void> {
    this.databoxModule ??= await this.findDataboxModule();
    const relativeScriptPath = this.findRelativeScriptPath(this.databoxModule);
    const databoxModuleVersion = this.loadDataboxModuleVersion();
    if (!this.databoxModule) {
      throw new Error('The exported databox object must specify a module');
    }
    if (!databoxModuleVersion) {
      throw new Error("The databox module does not specify a version in its package.json");
    }
    this.package = {
      manifest: {
        scriptEntrypoint: relativeScriptPath,
        scriptRollupHash: Hasher.hashDatabox(Buffer.from(sourceCode)),
        databoxModule: this.databoxModule,
        databoxModuleVersion,
      },
      script: sourceCode,
      sourceMap,
    };
    await safeOverwriteFile(
      `${this.outputPath}/manifest.json`,
      JSON.stringify(this.package.manifest, null, 2),
    );
  }

  public async upload(serverHost: string, timeoutMs = 120e3): Promise<void> {
    const connection = ConnectionToDataboxCore.remote(serverHost);
    try {
      await connection.sendRequest({ command: 'Databox.upload', args: [this.package] }, timeoutMs);
    } finally {
      await connection.disconnect();
    }
  }

  private loadDataboxModuleVersion(): string {
    try {
      return require(`${this.databoxModule}/package.json`).version;
    } catch (e) {
      return;
    }
  }

  private async findDataboxModule(): Promise<string> {
    const entrypoint = `${this.outputPath}/databox.js`;
    const databoxProcess = new LocalDataboxProcess(entrypoint);
    const databoxModule = await databoxProcess.fetchModule();
    await new Promise(resolve => setTimeout(resolve, 1e3));
    await databoxProcess.close();
    return databoxModule;
  }

  private findRelativeScriptPath(databoxModule: string): string {
    const projectPath = Path.resolve(this.findProjectPath(databoxModule));
    return Path.relative(`${projectPath}/..`, this.entrypoint);
  }

  private findProjectPath(databoxModule: string): string {
    try {
      const heroForDataboxPath = require(`${databoxModule}/package.json`);
      // find the top node modules in the path
      const rootPath = heroForDataboxPath.split('node_modules').shift();
      if (Fs.existsSync(Path.join(rootPath, 'package.json'))) {
        return rootPath;
      }
    } catch (e) {
      /* no-op */
    }

    let last: string;
    let path = this.entrypoint;
    do {
      last = path;
      if (Fs.existsSync(Path.join(path, 'package.json'))) {
        return path;
      }
      path = Path.dirname(path);
    } while (path && path !== last);
  }
}
