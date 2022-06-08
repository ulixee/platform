import * as WebSocket from 'ws';
import * as Http from 'http';
import { IncomingMessage, ServerResponse } from 'http';
import { AddressInfo, ListenOptions, Socket } from 'net';
import Log from '@ulixee/commons/lib/Logger';
import { createPromise } from '@ulixee/commons/lib/utils';
import { isWsOpen } from '@ulixee/net/lib/WsUtils';
import UlixeeServerConfig from '@ulixee/commons/config/servers';
import UlixeeConfig from '@ulixee/commons/config';
import CoreRouter from './lib/CoreRouter';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';

const pkg = require('./package.json');

const { log } = Log(module);

type IHttpHandleFn = (
  req: Http.IncomingMessage,
  res: Http.ServerResponse,
  params: string[],
) => void;
type IWsHandleFn = (ws: WebSocket, request: Http.IncomingMessage, params: string[]) => void;

export default class Server {
  public readonly wsServer: WebSocket.Server;

  public get address(): Promise<string> {
    return this.serverAddress.promise.then(x => {
      return `${this.addressHost}:${x.port}`;
    });
  }

  public get port(): Promise<number> {
    return this.serverAddress.promise.then(x => {
      return x.port;
    });
  }

  public get hasConnections(): boolean {
    return this.wsServer.clients.size > 0;
  }

  public get version(): string {
    return pkg.version;
  }

  private sockets = new Set<Socket>();
  private serverAddress = createPromise<AddressInfo>();
  private readonly addressHost: string;
  private readonly httpServer: Http.Server;
  private readonly router: CoreRouter;
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
  }

  public get dataDir(): string {
    return this.router.dataDir;
  }

  public async listen(options?: ListenOptions, shouldAutoRouteServer = true): Promise<AddressInfo> {
    if (this.serverAddress.isResolved) return this.serverAddress.promise;

    const listenOptions = { ...(options ?? { port: 0 }) };
    if (!options?.port && shouldAutoRouteServer) {
      const address = Server.getHost(this.version);
      if (address) {
        listenOptions.port = Number(address.split(':').pop());
      }
    }

    this.httpServer.once('error', this.serverAddress.reject);
    this.httpServer
      .listen(listenOptions, () => {
        this.httpServer.off('error', this.serverAddress.reject);
        this.serverAddress.resolve(this.httpServer.address() as AddressInfo);
      })
      .ref();
    const serverAddress = await this.serverAddress.promise;
    const isLocalhost =
      serverAddress.address === '127.0.0.1' ||
      serverAddress.address === '::' ||
      serverAddress.address === '::1';

    // if we're dealing with local or no configuration, set the local version host
    if (isLocalhost && !options?.port && shouldAutoRouteServer) {
      // publish port with the version
      await UlixeeServerConfig.global.setVersionHost(
        this.version,
        `localhost:${serverAddress.port}`,
      );
      ShutdownHandler.register(() => UlixeeServerConfig.global.setVersionHost(this.version, null));
    }

    await this.router.start(`${this.addressHost}:${serverAddress.port}`);

    return serverAddress;
  }

  public addHttpRoute(route: RegExp | string, method: string, handleFn: IHttpHandleFn): void {
    this.httpRoutes.push([route, method, handleFn]);
  }

  public addWsRoute(route: RegExp | string, handleFn: IWsHandleFn): void {
    this.wsRoutes.push([route, handleFn]);
  }

  public async close(closeDependencies = true): Promise<void> {
    try {
      const logid = log.stats('Server.Closing', {
        closeDependencies,
        sessionId: null,
      });

      await UlixeeServerConfig.global.setVersionHost(this.version, null);

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
      log.stats('Server.Closed', { parentLogId: logid, sessionId: null });
    } catch (error) {
      log.error('Error closing socket connections', {
        error,
        sessionId: null,
      });
    }
  }

  private handleHome(req: IncomingMessage, res: ServerResponse): void {
    res.end(`Ulixee Server v${this.version}`);
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
    log.warn('Error on Server.httpServer', {
      error,
      sessionId: null,
    });
  }

  public static getHost(version: string): string {
    return (
      UlixeeConfig.load()?.serverHost ??
      UlixeeConfig.global.serverHost ??
      UlixeeServerConfig.global.getVersionHost(version)
    );
  }
}
