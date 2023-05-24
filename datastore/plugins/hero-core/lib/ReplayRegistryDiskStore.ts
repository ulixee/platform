import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import { IReplayRegistryApiTypes } from '@ulixee/platform-specification/services/ReplayRegistryApis';
import * as Fs from 'fs';
import * as Path from 'path';
import { promisify } from 'util';
import { gunzip, gzip } from 'zlib';

const gunzipAsync = promisify(gunzip);
const gzipAsync = promisify(gzip);

export default class ReplayRegistryDiskStore {
  constructor(readonly storageDir: string) {}

  public async get(
    sessionId: string,
  ): Promise<IReplayRegistryApiTypes['ReplayRegistry.get']['result']> {
    const path = Path.join(this.storageDir, `${sessionId}.db.gz`);
    if (await existsAsync(path)) {
      const buffer = await Fs.promises.readFile(path);
      return {
        db: await gunzipAsync(buffer),
      };
    }
  }

  public async store(
    sessionId: string,
    db: Buffer,
  ): Promise<IReplayRegistryApiTypes['ReplayRegistry.store']['result']> {
    const path = Path.join(this.storageDir, `${sessionId}.db.gz`);
    await Fs.promises.writeFile(path, db);
    return { success: true };
  }

  public async ids(): Promise<IReplayRegistryApiTypes['ReplayRegistry.ids']['result']> {
    const sessionIds: IReplayRegistryApiTypes['ReplayRegistry.ids']['result']['sessionIds'] = [];
    if (!(await existsAsync(this.storageDir))) return { sessionIds };
    for (const dbName of await Fs.promises.readdir(this.storageDir)) {
      if (!dbName.endsWith('.db.gz')) continue;
      const sessionId = dbName.slice(0, -3);
      sessionIds.push(sessionId);
    }
    return { sessionIds };
  }

  public static async getCompressedDb(path: string): Promise<Buffer> {
    const file = await Fs.promises.readFile(path);
    return gzipAsync(file);
  }
}
