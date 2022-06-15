import * as Fs from 'fs';
import * as Path from 'path';
import IDataboxPackage from '@ulixee/databox-interfaces/IDataboxPackage';
import { readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManifest';
import * as Hasher from '@ulixee/commons/lib/Hasher';
import rollupDatabox from './lib/rollupDatabox';
import ConnectionToDataboxCore from './lib/ConnectionToDataboxCore';
import LocalDataboxProcess from '@ulixee/databox-core/lib/LocalDataboxProcess';
import { createPromise } from '@ulixee/commons/lib/utils';
import IResolvablePromise from '@ulixee/commons/interfaces/IResolvablePromise';

export default class DataboxPackager {
  public relativeScriptPath: string;
  public package: IDataboxPackage;
  public outputPath: string;
  public databoxModule: string;
  private projectPath: string;
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
    this.outputPath = options?.outputPath ? Path.resolve(options?.outputPath) : undefined;
  }

  public async loadPackage(): Promise<void> {
    await this.ensureSetup();
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
    await this.ensureSetup();
    const rollup = await rollupDatabox(this.entrypoint, {
      outDir: this.outputPath,
      tsconfig: options?.tsconfig,
    });
    return { sourceMap: rollup.sourceMap, sourceCode: rollup.code.toString('utf8') };
  }

  public async createManifest(sourceCode: string, sourceMap: string): Promise<void> {
    await this.ensureSetup();
    this.package = {
      manifest: {
        scriptEntrypoint: this.relativeScriptPath,
        scriptRollupHash: Hasher.hashDatabox(Buffer.from(sourceCode)),
        databoxModule: this.databoxModule,
        databoxModuleVersion: require(`${this.databoxModule}/package.json`).version,
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

  private async findDataboxModule(): Promise<string> {
    const databoxProcess = new LocalDataboxProcess(this.entrypoint);
    const databoxModule = await databoxProcess.fetchModule();
    await databoxProcess.close();
    return databoxModule;
  }

  private async ensureSetup(): Promise<void> {
    if (this.setupPromise) return this.setupPromise.promise;
    this.setupPromise = createPromise<void>();

    this.databoxModule ??= await this.findDataboxModule();
    this.projectPath = Path.resolve(this.findProjectPath());
    this.relativeScriptPath = Path.relative(`${this.projectPath  }/..`, this.entrypoint);

    if (this.outputPath) {
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

    this.setupPromise.resolve();
  }

  private findProjectPath(): string {
    try {
      const heroForDataboxPath = require(`${this.databoxModule}/package.json`);
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
