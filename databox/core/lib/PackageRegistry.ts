import IDataboxPackage from '@ulixee/databox-interfaces/IDataboxPackage';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import { promises as Fs, mkdirSync } from 'fs';
import * as crypto from 'crypto';
import * as Path from 'path';
import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManfiest';
import { nanoid } from 'nanoid';
import DataboxesDb from './DataboxesDb';
import { IDataboxRecord } from './DataboxesTable';

export default class PackageRegistry {
  private readonly databoxesDb: DataboxesDb;

  private get storageDir(): string {
    return Path.join(Path.resolve(this.baseDir), `/databoxes`);
  }

  constructor(readonly baseDir: string) {
    mkdirSync(this.storageDir, { recursive: true });
    this.databoxesDb = new DataboxesDb(baseDir);
  }

  public flush(): void {
    this.databoxesDb.flush();
  }

  public getByHash(hash: string): IDataboxRecord & { path: string } {
    const entry = this.databoxesDb.databoxes.getByHash(hash);
    if (!entry) throw new Error('Script not found locally');
    const path = this.getDataboxPathForId(entry.id);
    return {
      path,
      ...entry,
    };
  }

  public async save(databoxPackage: IDataboxPackage): Promise<{ id: string }> {
    this.checkDataboxModuleInstalled(
      databoxPackage.manifest.databoxModule,
      databoxPackage.manifest.databoxModuleVersion,
    );

    // validate hash
    const scriptBuffer = Buffer.from(databoxPackage.script);
    const expectedHash = this.sha3_256_base64(scriptBuffer);
    if (databoxPackage.manifest.scriptRollupHash !== expectedHash) {
      throw new Error(
        'Mismatched Databox scriptRollupHash provided. Should be SHA3 256 in Base64 format.',
      );
    }

    const id = await this.savePackage(
      scriptBuffer,
      Buffer.from(databoxPackage.sourceMap),
      databoxPackage.manifest,
    );
    return { id };
  }

  private checkDataboxModuleInstalled(module: string, version: string): void {
    let installedModuleVersion: string;
    try {
      const databoxPackageJson = require(`${module}/package.json`);
      installedModuleVersion = databoxPackageJson.version;
    } catch (error) {
      throw new Error(
        `The requested Databox Module (${module}) is not installed.\n${error.message}`,
      );
    }
    if (!isSemverSatisfied(version, installedModuleVersion)) {
      throw new Error(
        `The requested Databox Module Version (${installedModuleVersion}) is not compatible with the required version from your Databox Package (${module}).\n
Please try to re-upload after testing with the version available on this server.`,
      );
    }
  }

  private sha3_256_base64(data: Buffer): string {
    return crypto.createHash('sha3-256').update(data).digest('base64');
  }

  private getPathForId(id: string): string {
    return Path.resolve(this.storageDir, id);
  }

  private getDataboxPathForId(id: string): string {
    return Path.resolve(this.getPathForId(id), 'databox.js');
  }

  private async savePackage(
    script: Buffer,
    sourceMap: Buffer,
    manifest: IDataboxManifest,
  ): Promise<string> {
    const id = nanoid();

    const basePath = this.getPathForId(id);
    const databoxPath = this.getDataboxPathForId(id);
    await Fs.mkdir(basePath, { recursive: true });
    await Promise.all([
      Fs.writeFile(databoxPath, script),
      Fs.writeFile(`${databoxPath}.map`, sourceMap),
      Fs.writeFile(`${basePath}/manifest.json`, JSON.stringify(manifest, null, 2)),
    ]);
    this.databoxesDb.databoxes.save(id, manifest);

    return id;
  }
}
