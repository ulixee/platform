import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import { IReplayRegistryApiTypes } from '@ulixee/platform-specification/services/ReplayRegistryApis';
import * as Fs from 'fs';
import * as Path from 'path';
import { pipeline } from 'stream/promises';
import { createGunzip, createGzip } from 'zlib';

export default class ReplayRegistryDiskStore {
  constructor(readonly storageDir: string) {}

  public async get(
    sessionId: string,
  ): Promise<IReplayRegistryApiTypes['ReplayRegistry.get']['result']> {
    const path = Path.join(this.storageDir, `${sessionId}.db.gz`);
    if (await existsAsync(path)) {
      return await pipeline(
        Fs.createReadStream(path),
        createGunzip(),
        async result => {
          const buffers: Buffer[] = [];
          for await (const chunk of result) {
            buffers.push(chunk);
          }
          return { db: Buffer.concat(buffers) };
        },
        { end: true },
      );
    }
  }

  public async delete(
    sessionId: string,
  ): Promise<IReplayRegistryApiTypes['ReplayRegistry.delete']['result']> {
    const path = Path.join(this.storageDir, `${sessionId}.db.gz`);
    const didFail = await Fs.promises.unlink(path).catch(() => true);
    return { success: !didFail };
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
      const sessionId = dbName.slice(0, -6);
      sessionIds.push(sessionId);
    }
    return { sessionIds };
  }

  public static async getCompressedDb(path: string): Promise<Buffer> {
    return await pipeline(
      Fs.createReadStream(path),
      createGzip(),
      async result => {
        const buffers: Buffer[] = [];
        for await (const chunk of result) {
          buffers.push(chunk);
        }
        return Buffer.concat(buffers);
      },
      { end: true },
    );
  }
}
