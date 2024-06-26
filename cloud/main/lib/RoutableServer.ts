import WebSocket = require('ws');
import Log from '@ulixee/commons/lib/Logger';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import { bindFunctions, createPromise } from '@ulixee/commons/lib/utils';
import { isWsOpen } from '@ulixee/net/lib/WsUtils';
import * as Http from 'http';
import { IncomingMessage, ServerResponse } from 'http';
import { AddressInfo, ListenOptions, Socket } from 'net';

const pkg = require('../package.json');

const { log } = Log(module);

export type IHttpHandleFn = (
  req: Http.IncomingMessage,
  res: Http.ServerResponse,
  params: string[],
) => Promise<boolean | void> | void;

export type IWsHandleFn = (ws: WebSocket, request: Http.IncomingMessage, params: string[]) => void;

export default class RoutableServer {
  public readonly wsServer: WebSocket.Server;

  public get host(): Promise<string> {
    return this.listeningPromise.promise.then(x => {
      return `${this.hostname}:${x.port}`;
    });
  }

  public get port(): Promise<number> {
    return this.listeningPromise.promise.then(x => {
      return x.port;
    });
  }

  public get hasConnections(): boolean {
    return this.wsServer.clients.size > 0;
  }

  public get connections(): number {
    return this.wsServer.clients.size;
  }

  public get version(): string {
    return pkg.version;
  }

  public readonly hostname: string;

  private isClosing: Promise<any>;
  private sockets = new Set<Socket>();
  private listeningPromise = createPromise<AddressInfo>();
  private readonly httpServer: Http.Server;
  private readonly httpRoutes: [url: RegExp | string, method: string, handler: IHttpHandleFn][];
  private readonly wsRoutes: [RegExp | string, IWsHandleFn][] = [];

  constructor(
    private isReadyToServe: Promise<void>,
    hostname?: string,
    addRouters?: boolean,
  ) {
    this.httpServer = new Http.Server();
    bindFunctions(this);
    this.httpServer.on('error', this.onHttpError);
    if (addRouters !== false) {
      this.httpServer.on('request', this.handleHttpRequest);
    }
    this.httpServer.on('connection', this.handleHttpConnection);
    this.hostname = hostname ?? 'localhost';
    this.wsServer = new WebSocket.Server({
      server: this.httpServer,
      perMessageDeflate: { threshold: 500, serverNoContextTakeover: false },
    });
    if (addRouters !== false) {
      this.wsServer.on('connection', this.handleWsConnection);
    }
    this.httpRoutes = [];
  }

  public async listen(options?: ListenOptions): Promise<AddressInfo> {
    if (this.listeningPromise.isResolved) return this.listeningPromise.promise;

    try {
      options ??= {};
      options.port ??= 0;
      const addressHost = await new Promise<AddressInfo>((resolve, reject) => {
        this.httpServer.once('error', reject);
        this.httpServer
          .listen(options, () => {
            this.httpServer.off('error', reject);
            resolve(this.httpServer.address() as AddressInfo);
          })
          .ref();
      });
      this.listeningPromise.resolve(addressHost);
    } catch (error) {
      this.listeningPromise.reject(error);
    }
    return this.listeningPromise;
  }

  public addHttpRoute(route: RegExp | string, method: string, handleFn: IHttpHandleFn): void {
    this.httpRoutes.push([route, method, handleFn]);
  }

  public addWsRoute(route: RegExp | string, handleFn: IWsHandleFn): void {
    this.wsRoutes.push([route, handleFn]);
  }

  public close(): Promise<void> {
    if (this.isClosing) return this.isClosing;
    const resolvable = new Resolvable<void>();
    try {
      this.isClosing = resolvable.promise;
      const logid = log.stats('RoutingServer.Closing', {
        sessionId: null,
      });

      for (const ws of this.wsServer.clients) {
        if (isWsOpen(ws)) ws.terminate();
      }

      for (const socket of this.sockets) {
        socket.unref();
        socket.destroy();
      }

      if (this.httpServer.listening) this.httpServer.unref().close();
      log.stats('RoutingServer.Closed', { parentLogId: logid, sessionId: null });
      resolvable.resolve();
    } catch (error) {
      log.error('Error closing socket connections', {
        error,
        sessionId: null,
      });
      resolvable.reject(error);
    }
    return resolvable.promise;
  }

  private async handleHttpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      await this.listeningPromise;
      await this.isReadyToServe;
      for (const [route, method, handlerFn] of this.httpRoutes) {
        if (req.method !== method) continue;
        if (route instanceof RegExp && route.test(req.url)) {
          const args = route.exec(req.url);
          const handled = await handlerFn(req, res, args?.length ? args.slice(1) : []);
          if (handled !== false) return;
        }
        if (req.url === route) {
          const handled = await handlerFn(req, res, []);
          if (handled !== false) return;
        }
      }

      res.writeHead(404);
      res.end('Route not found');
    } catch (error) {
      res.writeHead(500);
      res.end('Unhandled Error', error.message);
    }
  }

  private handleHttpConnection(socket: Socket): void {
    this.sockets.add(socket);
    socket.on('close', () => this.sockets.delete(socket));
  }

  private async handleWsConnection(ws: WebSocket, req: Http.IncomingMessage): Promise<void> {
    await this.listeningPromise;
    await this.isReadyToServe;
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
    log.warn('Error on WebsocketServer.httpServer', {
      error,
      sessionId: null,
    });
  }
}
