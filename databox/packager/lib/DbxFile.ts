import * as Tar from 'tar';
import * as Fs from 'fs/promises';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import * as Path from 'path';
import ConnectionToDataboxCore from './ConnectionToDataboxCore';
import DataboxManifest from './DataboxManifest';

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

  public async upload(serverHost: string, timeoutMs = 120e3): Promise<void> {
    const connection = ConnectionToDataboxCore.remote(serverHost);
    const compressedPackage = await Fs.readFile(this.dbxPath);
    try {
      await connection.sendRequest(
        { command: 'Databox.upload', args: [compressedPackage] },
        timeoutMs,
      );
    } finally {
      await connection.disconnect();
    }
  }

  public async close(): Promise<void> {
    if (await existsAsync(this.workingDirectory)) {
      await Fs.rm(this.workingDirectory, { recursive: true });
    }
  }

  private async createWorkingDirectory(): Promise<void> {
    if (!(await existsAsync(this.workingDirectory))) {
      await Fs.mkdir(this.workingDirectory, { recursive: true });
    }
  }
}
