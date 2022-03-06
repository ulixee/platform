import * as WebSocket from 'ws';
import * as Http from 'http';
import { IncomingMessage, ServerResponse } from 'http';
import { AddressInfo, ListenOptions, Socket } from 'net';
import Log from '@ulixee/commons/lib/Logger';
import { createPromise } from '@ulixee/commons/lib/utils';
import { isWsOpen } from './lib/WsUtils';
import CoreConnectors from './lib/CoreConnectors';

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

  public get hasConnections() {
    return this.wsServer.clients.size > 0;
  }

  private sockets = new Set<Socket>();
  private serverAddress = createPromise<AddressInfo>();
  private readonly addressHost: string;
  private readonly httpServer: Http.Server;
  private readonly coreConnectors: CoreConnectors;
  private readonly httpRoutes: [RegExp | string, IHttpHandleFn][];
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
    this.httpRoutes = [['/', this.handleHome.bind(this)]];
    this.coreConnectors = new CoreConnectors(this);
  }

  public get dataDir(): string {
    return this.coreConnectors.heroConnector.dataDir;
  }

  public async listen(options: ListenOptions): Promise<AddressInfo> {
    if (this.serverAddress.isResolved) return this.serverAddress.promise;

    this.httpServer.once('error', this.serverAddress.reject);
    this.httpServer
      .listen(options, () => {
        this.httpServer.off('error', this.serverAddress.reject);
        this.serverAddress.resolve(this.httpServer.address() as AddressInfo);
      })
      .ref();
    await this.coreConnectors.start();
    return this.serverAddress.promise;
  }

  public addHttpRoute(route: RegExp | string, handleFn: IHttpHandleFn) {
    this.httpRoutes.push([route, handleFn]);
  }

  public addWsRoute(route: RegExp | string, handleFn: IWsHandleFn) {
    this.wsRoutes.push([route, handleFn]);
  }

  public async close(closeDependencies = true): Promise<void> {
    try {
      const logid = log.stats('Server.Closing', {
        closeDependencies,
        sessionId: null,
      });

      if (closeDependencies) {
        await this.coreConnectors.close();
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

  private handleHome(req: IncomingMessage, res: ServerResponse) {
    res.end(`Ulixee Server v${pkg.version}`);
  }

  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    for (const [route, handlerFn] of this.httpRoutes) {
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

  private onHttpError(error: Error) {
    log.warn('Error on Server.httpServer', {
      error,
      sessionId: null,
    });
  }
}
