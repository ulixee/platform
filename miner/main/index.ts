import * as WebSocket from 'ws';
import * as Http from 'http';
import { IncomingMessage, ServerResponse } from 'http';
import { AddressInfo, ListenOptions, Socket } from 'net';
import Log from '@ulixee/commons/lib/Logger';
import { createPromise } from '@ulixee/commons/lib/utils';
import { isWsOpen } from '@ulixee/net/lib/WsUtils';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import UlixeeConfig from '@ulixee/commons/config';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import CoreRouter from './lib/CoreRouter';

const pkg = require('./package.json');

const { log } = Log(module);

type IHttpHandleFn = (
  req: Http.IncomingMessage,
  res: Http.ServerResponse,
  params: string[],
) => void;
type IWsHandleFn = (ws: WebSocket, request: Http.IncomingMessage, params: string[]) => void;

export default class Miner {
  public readonly wsServer: WebSocket.Server;
  public readonly router: CoreRouter;

  public get address(): Promise<string> {
    return this.finalAddressHostPromise.promise.then(x => {
      return `${this.addressHost}:${x.port}`;
    });
  }

  public get port(): Promise<number> {
    return this.finalAddressHostPromise.promise.then(x => {
      return x.port;
    });
  }

  public get hasConnections(): boolean {
    return this.wsServer.clients.size > 0;
  }

  public get version(): string {
    return pkg.version;
  }

  private didAutoroute = false;
  private sockets = new Set<Socket>();
  private finalAddressHostPromise = createPromise<AddressInfo>();
  private readonly addressHost: string;
  private readonly httpServer: Http.Server;
  private readonly httpRoutes: [url: RegExp | string, method: string, handler: IHttpHandleFn][];
  private readonly wsRoutes: [RegExp | string, IWsHandleFn][] = [];

  constructor(addressHost = 'localhost') {
    this.httpServer = new Http.Server();
    this.httpServer.on('error', this.onHttpError.bind(this));
    this.httpServer.on('request', this.handleHttpRequest.bind(this));
    this.httpServer.on('connection', this.handleHttpConnection.bind(this));
    this.addressHost = addressHost;
    this.wsServer = new WebSocket.Server({
      server: this.httpServer,
      perMessageDeflate: { threshold: 500, serverNoContextTakeover: false },
    });
    this.wsServer.on('connection', this.handleWsConnection.bind(this));
    this.httpRoutes = [];
    this.router = new CoreRouter(this);
    this.addHttpRoute('/', 'GET', this.handleHome.bind(this));
    ShutdownHandler.register(() => this.close());
  }

  public get dataDir(): string {
    return this.router.dataDir;
  }

  public async listen(options?: ListenOptions, shouldAutoRouteToHost = true): Promise<AddressInfo> {
    if (this.finalAddressHostPromise.isResolved) return this.finalAddressHostPromise.promise;

    const listenOptions = { ...(options ?? { port: 0 }) };
    if (!options?.port && shouldAutoRouteToHost) {
      const address = Miner.getHost(this.version);
      if (address) {
        listenOptions.port = Number(address.split(':').pop());
      }
    }

    this.httpServer.once('error', this.finalAddressHostPromise.reject);
    this.httpServer
      .listen(listenOptions, () => {
        this.httpServer.off('error', this.finalAddressHostPromise.reject);
        this.finalAddressHostPromise.resolve(this.httpServer.address() as AddressInfo);
      })
      .ref();
    const addressHost = await this.finalAddressHostPromise.promise;
    const isLocalhost =
      addressHost.address === '127.0.0.1' ||
      addressHost.address === '::' ||
      addressHost.address === '::1';

    // if we're dealing with local or no configuration, set the local version host
    if (isLocalhost && !options?.port && shouldAutoRouteToHost) {
      // publish port with the version
      await UlixeeHostsConfig.global.setVersionHost(
        this.version,
        `localhost:${addressHost.port}`,
      );
      this.didAutoroute = true;
      ShutdownHandler.register(() => UlixeeHostsConfig.global.setVersionHost(this.version, null));
    }

    await this.router.start(`${this.addressHost}:${addressHost.port}`);

    return addressHost;
  }

  public addHttpRoute(route: RegExp | string, method: string, handleFn: IHttpHandleFn): void {
    this.httpRoutes.push([route, method, handleFn]);
  }

  public addWsRoute(route: RegExp | string, handleFn: IWsHandleFn): void {
    this.wsRoutes.push([route, handleFn]);
  }

  public async close(closeDependencies = true): Promise<void> {
    try {
      const logid = log.stats('Miner.Closing', {
        closeDependencies,
        sessionId: null,
      });

      if (this.didAutoroute) {
        await UlixeeHostsConfig.global.setVersionHost(this.version, null);
      }

      if (closeDependencies) {
        await this.router.close();
      }

      for (const ws of this.wsServer.clients) {
        if (isWsOpen(ws)) ws.terminate();
      }

      for (const socket of this.sockets) {
        socket.unref();
        socket.destroy();
      }

      if (this.httpServer.listening) this.httpServer.unref().close();
      log.stats('Miner.Closed', { parentLogId: logid, sessionId: null });
    } catch (error) {
      log.error('Error closing socket connections', {
        error,
        sessionId: null,
      });
    }
  }

  private handleHome(req: IncomingMessage, res: ServerResponse): void {
    res.end(`Ulixee Miner v${this.version}`);
  }

  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    for (const [route, method, handlerFn] of this.httpRoutes) {
      if (req.method !== method) continue;
      if (route instanceof RegExp && route.test(req.url)) {
        const args = route.exec(req.url);
        handlerFn(req, res, args?.length ? args.slice(1) : []);
        return;
      }
      if (req.url === route) {
        return handlerFn(req, res, []);
      }
    }
    res.writeHead(404);
    res.end('Route not found');
  }

  private handleHttpConnection(socket: Socket): void {
    this.sockets.add(socket);
    socket.on('close', () => this.sockets.delete(socket));
  }

  private handleWsConnection(ws: WebSocket, req: Http.IncomingMessage): void {
    for (const [route, handlerFn] of this.wsRoutes) {
      if (route instanceof RegExp && route.test(req.url)) {
        const args = route.exec(req.url);
        handlerFn(ws, req, args?.length ? args.slice(1) : []);
        return;
      }
      if (req.url === route) {
        handlerFn(ws, req, []);
        return;
      }
    }
    ws.close();
  }

  private onHttpError(error: Error): void {
    log.warn('Error on Miner.httpServer', {
      error,
      sessionId: null,
    });
  }

  public static getHost(version: string): string {
    return (
      UlixeeConfig.load()?.defaultMinerHost ??
      UlixeeConfig.global.defaultMinerHost ??
      UlixeeHostsConfig.global.getVersionHost(version)
    );
  }
}
