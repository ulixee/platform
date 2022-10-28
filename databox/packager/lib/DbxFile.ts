import * as Tar from 'tar';
import * as Fs from 'fs/promises';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import * as Path from 'path';
import DataboxManifest from '@ulixee/databox-core/lib/DataboxManifest';
import Identity from '@ulixee/crypto/lib/Identity';
import DataboxApiClient from '@ulixee/databox/lib/DataboxApiClient';

export default class DbxFile {
  public readonly workingDirectory: string;

  constructor(public readonly dbxPath: string) {
    this.workingDirectory = `${dbxPath}.build`;
  }

  public async exists(): Promise<boolean> {
    return await existsAsync(this.dbxPath);
  }

  public async isOpen(): Promise<boolean> {
    return await existsAsync(this.workingDirectory);
  }

  public async open(onlyManifest = false): Promise<boolean> {
    if (await this.exists()) {
      await this.createWorkingDirectory();
      await Tar.extract({
        cwd: this.workingDirectory,
        file: this.dbxPath,
        filter(path: string): boolean {
          if (onlyManifest) return path.endsWith('-manifest.json');
          return true;
        },
      });
      return true;
    }
    return false;
  }

  public async getEmbeddedManifest(): Promise<DataboxManifest> {
    // read from the dbx if from file
    await this.open();
    const manifest = new DataboxManifest(Path.join(this.workingDirectory, 'databox-manifest.json'));
    await manifest.load();
    await this.close();
    return manifest;
  }

  public async save(keepOpen = false): Promise<void> {
    if (!(await existsAsync(this.workingDirectory))) return;
    await Tar.create(
      {
        gzip: true,
        cwd: this.workingDirectory,
        file: this.dbxPath,
      },
      ['databox.js', 'databox.js.map', 'databox-manifest.json'],
    );
    if (!keepOpen) await this.close();
  }

  public async delete(): Promise<void> {
    await Fs.unlink(this.dbxPath);
  }

  public async close(): Promise<void> {
    if (await existsAsync(this.workingDirectory)) {
      await Fs.rm(this.workingDirectory, { recursive: true });
    }
  }

  public asBuffer(): Promise<Buffer> {
    return Fs.readFile(this.dbxPath);
  }

  public async upload(
    host: string,
    options: {
      allowNewLinkedVersionHistory?: boolean;
      identity?: Identity;
      timeoutMs?: number;
    } = {},
  ): Promise<{ success: boolean }> {
    const compressedDatabox = await this.asBuffer();

    const client = new DataboxApiClient(host);
    try {
      return await client.upload(compressedDatabox, options);
    } finally {
      await client.disconnect();
    }
  }

  private async createWorkingDirectory(): Promise<void> {
    if (!(await existsAsync(this.workingDirectory))) {
      await Fs.mkdir(this.workingDirectory, { recursive: true });
    }
  }
}
