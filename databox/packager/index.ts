import * as Fs from 'fs';
import * as Path from 'path';
import IDataboxPackage from '@ulixee/databox-interfaces/IDataboxPackage';
import rollupDatabox from './lib/rollupDatabox';
import { createHash } from 'crypto';
import { safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import { ConnectionToDataboxCore } from '@ulixee/databox-client';

export default class DataboxPackager {
  public readonly relativeScriptPath: string;
  public package: IDataboxPackage;
  public outputPath: string;
  private readonly projectPath: string;

  constructor(readonly entrypoint: string, readonly databoxModule = '@ulixee/databox-for-hero') {
    this.projectPath = Path.resolve(this.findProjectPath());
    this.entrypoint = Path.resolve(entrypoint);
    this.relativeScriptPath = Path.relative(this.projectPath + '/..', entrypoint);

    const databoxPath = Path.resolve(Path.dirname(entrypoint), '.databox');

    const shortScriptName = Path.basename(entrypoint)
      .replace(Path.extname(entrypoint), '')
      .replace(/[.]/g, '-')
      .toLowerCase();

    this.outputPath = Path.join(databoxPath, shortScriptName);
  }

  public async build(): Promise<void> {
    const { sourceCode, sourceMap } = await this.rollup();
    await this.createManifest(sourceCode, sourceMap);
  }

  public async rollup(): Promise<{ sourceMap: string; sourceCode: string }> {
    const rollup = await rollupDatabox(this.entrypoint, { outDir: this.outputPath });
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

  public async upload(serverHost: string): Promise<void> {
    const connection = ConnectionToDataboxCore.remote(serverHost);
    try {
      await connection.sendRequest({ command: 'Databox.upload', args: [this.package] }, 120e3);
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
