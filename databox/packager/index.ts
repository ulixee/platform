import * as Fs from 'fs';
import * as Path from 'path';
import IDataboxPackage from '@ulixee/databox-interfaces/IDataboxPackage';
import { getCacheDirectory } from '@ulixee/commons/lib/dirUtils';
import rollupDatabox from './lib/rollupDatabox';
import { createHash } from 'crypto';
import { safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';

export default class DatabasePackager {
  public readonly relativeScriptPath: string;
  public package: IDataboxPackage;
  public outputPath: string;
  private readonly projectPath: string;

  constructor(readonly entrypoint: string, readonly databoxType: string = 'databox-for-hero') {
    this.projectPath = Path.resolve(DatabasePackager.findProjectPath(entrypoint));
    this.entrypoint = Path.resolve(entrypoint);
    this.relativeScriptPath = Path.relative(this.projectPath + '/..', entrypoint);

    const databoxPath = Path.resolve(Path.join(getCacheDirectory(), 'ulixee', 'databox'));

    const startPathLength = databoxPath.length;
    const allowCharacterLength = (process.platform === 'win32' ? 260 : 1024) - startPathLength - 1;
    const shortScriptName = this.relativeScriptPath
      .replace(Path.extname(this.relativeScriptPath), '')
      .replace(/[.]/g, '-')
      .replace(/[\\\/]/g, '-')
      .substring(0, allowCharacterLength)
      .toLowerCase();

    this.outputPath = Path.join(getCacheDirectory(), 'ulixee', 'databox', shortScriptName);
  }

  public async create(): Promise<void> {
    const rollup = await rollupDatabox(this.entrypoint, { outDir: this.outputPath });
    this.package = {
      manifest: {
        scriptEntrypoint: this.relativeScriptPath,
        scriptRollupHash: DatabasePackager.sha3_256_base64(rollup.code),
        databoxType: this.databoxType,
        databoxTypeVersion: require('@ulixee/databox-for-hero/package.json').version,
      },
      script: rollup.code.toString('utf8'),
      sourceMap: rollup.sourceMap,
    };
    await safeOverwriteFile(
      `${this.outputPath}/manifest.json`,
      JSON.stringify(this.package.manifest, null, 2),
    );
  }

  public async upload(serverHost: string): Promise<void> {
    // do things
  }

  private static findProjectPath(entrypoint: string): string {
    try {
      const heroForDataboxPath = require.resolve('@ulixee/hero-for-databox/package.json');
      // find the top node modules in the path
      const rootPath = heroForDataboxPath.split('node_modules').shift();
      if (Fs.existsSync(Path.join(rootPath, 'package.json'))) {
        return rootPath;
      }
    } catch (e) {}

    let last: string;
    let path = entrypoint;
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
