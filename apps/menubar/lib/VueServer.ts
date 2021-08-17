import * as Http from 'http';
import { Server as StaticServer } from 'node-static';
import { AddressInfo } from 'net';

export default class VueServer {
  #httpServer: Http.Server;
  #serverAddress: Promise<AddressInfo>;

  public get port(): Promise<number> {
    return this.#serverAddress.then(x => {
      return x.port;
    });
  }

  constructor(distFolder: string) {
    const staticServer = new StaticServer(distFolder);

    this.#httpServer = Http.createServer((req, res) => {
      staticServer.serve(req, res);
    });

    this.#serverAddress = new Promise((resolve, reject) => {
      this.#httpServer.once('error', reject);
      this.#httpServer.listen({ port: 0 }, () => {
        this.#httpServer.off('error', reject);
        resolve(this.#httpServer.address() as AddressInfo);
      });
    });
  }
}
