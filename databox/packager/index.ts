import * as Fs from 'fs';
import * as Path from 'path';
import IDataboxPackage from '@ulixee/databox-interfaces/IDataboxPackage';
import rollupDatabox from './lib/rollupDatabox';
import { createHash } from 'crypto';
import { readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import { ConnectionToDataboxCore } from '@ulixee/databox-client';
import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManifest';

export default class DataboxPackager {
  public readonly relativeScriptPath: string;
  public package: IDataboxPackage;
  public outputPath: string;
  public readonly databoxModule: string;
  private readonly projectPath: string;

  constructor(
    readonly entrypoint: string,
    options?: {
      databoxModule?: string;
      outputPath?: string;
    },
  ) {
    this.databoxModule = options?.databoxModule ?? '@ulixee/databox-for-hero';
    this.projectPath = Path.resolve(this.findProjectPath());
    this.entrypoint = Path.resolve(entrypoint);
    this.relativeScriptPath = Path.relative(this.projectPath + '/..', entrypoint);
    if (options?.outputPath) {
      this.outputPath = Path.resolve(options.outputPath);
      const path = this.outputPath;
      if (Fs.existsSync(path) && !Fs.lstatSync(path).isDirectory()) {
        this.outputPath = Path.dirname(path);
      }
    } else {
      const outputDir = Path.resolve(Path.dirname(entrypoint), '.databox');

      const shortScriptName = Path.basename(entrypoint)
        .replace(Path.extname(entrypoint), '')
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
    this.package = {
      manifest: {
        scriptEntrypoint: this.relativeScriptPath,
        scriptRollupHash: DataboxPackager.sha3_256_base64(Buffer.from(sourceCode)),
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

  private findProjectPath(): string {
    try {
      const heroForDataboxPath = require(`${this.databoxModule}/package.json`);
      // find the top node modules in the path
      const rootPath = heroForDataboxPath.split('node_modules').shift();
      if (Fs.existsSync(Path.join(rootPath, 'package.json'))) {
        return rootPath;
      }
    } catch (e) {}

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

  private static sha3_256_base64(data: Buffer): string {
    return createHash('sha3-256').update(data).digest('base64');
  }
}
