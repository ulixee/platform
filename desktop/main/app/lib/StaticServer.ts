import * as Http from 'http';
import { AddressInfo } from 'net';
import { app } from 'electron';
import * as Fs from 'fs';
import staticServe from '@ulixee/platform-utils/lib/staticServe';

export default class StaticServer {
  #httpServer: Http.Server;
  #serverPort: number;

  constructor(distFolder: string, cacheTime?: number) {
    cacheTime ??= app.isPackaged ? 3600 * 24 : 0;

    if (!Fs.existsSync(distFolder))
      throw new Error(`Static UI files could not be found: ${distFolder}`);
    const fileServer = staticServe(distFolder, cacheTime);

    this.#httpServer = Http.createServer((req, res) => {
     void fileServer(req, res).catch(() => null);
    });
  }

  public async load(): Promise<void> {
    this.#serverPort = await new Promise((resolve, reject) => {
      this.#httpServer.once('error', reject);
      this.#httpServer.listen({ port: 0 }, () => {
        this.#httpServer.off('error', reject);
        resolve((this.#httpServer.address() as AddressInfo).port);
      });
    });
  }

  public getPath(path: string): string {
    if (path.startsWith('/')) path = path.slice(1);
    return `http://localhost:${this.#serverPort}/${path}`;
  }
}
