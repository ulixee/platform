import IDataboxPackage from '@ulixee/databox-interfaces/IDataboxPackage';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import { promises as Fs } from 'fs';
import * as Hasher from '@ulixee/commons/lib/Hasher';
import * as Path from 'path';
import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManifest';
import { existsAsync, readFileAsJson } from '@ulixee/commons/lib/fileUtils';
import DataboxesDb from './DataboxesDb';
import { IDataboxRecord } from './DataboxesTable';

export default class PackageRegistry {
  private readonly databoxesDb: DataboxesDb;

  constructor(readonly storageDir: string) {
    this.databoxesDb = new DataboxesDb(storageDir);
  }

  public flush(): void {
    this.databoxesDb.flush();
  }

  public async getByHash(hash: string): Promise<IDataboxRecord & { path: string }> {
    const path = this.getDataboxPathForHash(hash);
    let entry = this.databoxesDb.databoxes.getByHash(hash);
    if (!entry) {
      // read from disk if added in backend
      if (await existsAsync(path)) {
        const manifest = await readFileAsJson<IDataboxManifest>(this.getManifestPathForHash(hash));
        this.databoxesDb.databoxes.save(manifest);
        entry = this.databoxesDb.databoxes.getByHash(hash);
      }
    }
    if (!entry) throw new Error('Script not found locally');
    return {
      path,
      ...entry,
    };
  }

  public async save(databoxPackage: IDataboxPackage): Promise<void> {
    this.checkDataboxRuntimeInstalled(
      databoxPackage.manifest.runtimeName,
      databoxPackage.manifest.runtimeVersion,
    );

    // validate hash
    const scriptBuffer = Buffer.from(databoxPackage.script);
    const expectedHash = Hasher.hashDatabox(scriptBuffer);
    if (databoxPackage.manifest.scriptRollupHash !== expectedHash) {
      throw new Error(
        'Mismatched Databox scriptRollupHash provided. Should be SHA3 256 in Bech32m format.',
      );
    }

    await this.savePackage(
      scriptBuffer,
      Buffer.from(databoxPackage.sourceMap),
      databoxPackage.manifest,
    );
  }

  private checkDataboxRuntimeInstalled(name: string, version: string): void {
    let installedRuntimeVersion: string;
    try {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      const databoxPackageJson = require(`${name}-core-runtime/package.json`);
      installedRuntimeVersion = databoxPackageJson.version;
    } catch (error) {
      throw new Error(
        `The requested Databox runtime (${name}) is not installed.\n${error.message}`,
      );
    }
    if (!isSemverSatisfied(version, installedRuntimeVersion)) {
      throw new Error(
        `The requested Databox Module Version (${installedRuntimeVersion}) is not compatible with the required version from your Databox Package (${name}).\n
Please try to re-upload after testing with the version available on this server.`,
      );
    }
  }

  private getPathForHash(hash: string): string {
    return Path.resolve(this.storageDir, hash);
  }

  private getManifestPathForHash(hash: string): string {
    return Path.resolve(this.getPathForHash(hash), 'manifest.json');
  }

  private getDataboxPathForHash(hash: string): string {
    return Path.resolve(this.getPathForHash(hash), 'databox.js');
  }

  private async savePackage(
    script: Buffer,
    sourceMap: Buffer,
    manifest: IDataboxManifest,
  ): Promise<string> {
    const hash = manifest.scriptRollupHash;
    const basePath = this.getPathForHash(hash);
    const databoxPath = this.getDataboxPathForHash(hash);
    await Fs.mkdir(basePath, { recursive: true });
    await Promise.all([
      Fs.writeFile(databoxPath, script),
      Fs.writeFile(`${databoxPath}.map`, sourceMap),
      Fs.writeFile(this.getManifestPathForHash(hash), JSON.stringify(manifest, null, 2)),
    ]);
    this.databoxesDb.databoxes.save(manifest);

    return hash;
  }
}
