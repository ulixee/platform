import * as WebSocket from 'ws';
import { IncomingMessage, ServerResponse } from 'http';
import DatastoreCore from '@ulixee/datastore-core';
import HeroCore from '@ulixee/hero-core';
import IDatastoreCoreConfigureOptions from '@ulixee/datastore-core/interfaces/IDatastoreCoreConfigureOptions';
import WsTransportToClient from '@ulixee/net/lib/WsTransportToClient';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import IConnectionToClient from '@ulixee/net/interfaces/IConnectionToClient';
import ICoreConfigureOptions from '@ulixee/hero-interfaces/ICoreConfigureOptions';
import Logger from '@ulixee/commons/lib/Logger';
import ApiRegistry from '@ulixee/net/lib/ApiRegistry';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import { ICloudApis } from '@ulixee/platform-specification/cloud/index';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import { ConnectionToCore } from '@ulixee/net';
import { datastoreRegex } from '@ulixee/platform-specification/types/datastoreVersionHashValidation';
import ICloudEvents from '../interfaces/ICloudEvents';
import CloudStatus from '../endpoints/Cloud.status';
import ICloudApiContext from '../interfaces/ICloudApiContext';
import CloudNode, { IHttpHandleFn } from './CloudNode';
import DesktopUtils from './DesktopUtils';

const { log } = Logger(module);

export default class CoreRouter {
  public static datastorePluginsToRegister = [
    '@ulixee/datastore-plugins-hero-core/register',
    '@ulixee/datastore-plugins-puppeteer-core/register',
  ];

  public heroConfiguration: ICoreConfigureOptions;
  public datastoreConfiguration: Partial<IDatastoreCoreConfigureOptions>;
  private serverAddress: { ipAddress: string; port: number };

  public get dataDir(): string {
    return HeroCore.dataDir;
  }

  public get datastoresDir(): string {
    return DatastoreCore.datastoresDir;
  }

  private isClosing: Promise<void>;
  private cloudNode: CloudNode;
  private readonly connections = new Set<IConnectionToClient<any, any>>();

  private apiRegistry = new ApiRegistry<ICloudApiContext>([CloudStatus]);

  private wsConnectionByType = {
    hero: transport => HeroCore.addConnection(transport),
    chromealive: (transport, req) =>
      DesktopUtils.getDesktop().addChromeAliveConnection(transport, req),
    datastore: transport => DatastoreCore.addConnection(transport) as any,
    desktop: (transport, req) =>
      DesktopUtils.getDesktop().addDesktopConnection(transport, req) as any,
    desktopRaw: (ws, req) => {
      DesktopUtils.getDesktop().addAppDevtoolsWebsocket(ws, req);
    },
    cloud: transport => this.addCloudApiConnection(transport),
  } as const;

  private httpRoutersByType: {
    [key: string]: IHttpHandleFn;
  } = {
    datastore: DatastoreCore.routeHttp.bind(DatastoreCore),
    datastoreCreditBalance: DatastoreCore.routeCreditsBalanceApi.bind(DatastoreCore),
    datastoreRoot: DatastoreCore.routeHttpRoot.bind(DatastoreCore),
    datastoreOptions: DatastoreCore.routeOptions.bind(DatastoreCore),
  };

  constructor(cloudNode: CloudNode) {
    this.cloudNode = cloudNode;

    cloudNode.addWsRoute('/hero', this.handleSocketRequest.bind(this, 'hero'));
    cloudNode.addWsRoute('/datastore', this.handleSocketRequest.bind(this, 'datastore'));
    cloudNode.addHttpRoute('/server-details', 'GET', this.handleHttpServerDetails.bind(this));
    cloudNode.addHttpRoute(
      /.*\/free-credits\/?\?crd[A-Za-z0-9_]{8}.*/,
      'GET',
      this.handleHttpRequest.bind(this, 'datastoreCreditBalance'),
    );
    cloudNode.addHttpRoute(
      new RegExp(`/(${datastoreRegex.source})(.*)`),
      'GET',
      this.handleHttpRequest.bind(this, 'datastore'),
    );
    cloudNode.addHttpRoute(/\/(.*)/, 'GET', this.handleHttpRequest.bind(this, 'datastoreRoot'));
    cloudNode.addHttpRoute('/', 'OPTIONS', this.handleHttpRequest.bind(this, 'datastoreOptions'));
    // last option
    cloudNode.addHttpRoute('/', 'GET', this.handleHome.bind(this));

    for (const module of CoreRouter.datastorePluginsToRegister) {
      safeRegisterModule(module);
    }

    if (DesktopUtils.isInstalled()) {
      cloudNode.addWsRoute(
        /\/desktop-devtools\?id=.+/,
        this.handleRawSocketRequest.bind(this, 'desktopRaw'),
      );
      cloudNode.addWsRoute(/\/desktop(\?.+)?/, this.handleSocketRequest.bind(this, 'desktop'));
      cloudNode.addWsRoute(/\/chromealive\/.+/, this.handleSocketRequest.bind(this, 'chromealive'));
    }
  }

  public async start(cloudNodeAddress: string): Promise<void> {
    const startLogId = log.info('CloudNode.start', {
      cloudNodeAddress,
      sessionId: null,
    });
    try {
      HeroCore.onShutdown = () => this.cloudNode.close();
      this.heroConfiguration ??= {};
      this.heroConfiguration.shouldShutdownOnSignals ??= this.cloudNode.shouldShutdownOnSignals;
      await HeroCore.start(this.heroConfiguration);

      if (this.datastoreConfiguration) {
        Object.assign(DatastoreCore.options, this.datastoreConfiguration);
      }

      const [ipAddress, port] = cloudNodeAddress.split(':');
      this.serverAddress = { ipAddress, port: Number(port) };
      await DatastoreCore.start({ ipAddress, port: this.serverAddress.port });

      if (DesktopUtils.isInstalled()) {
        const desktopCore = DesktopUtils.getDesktop();
        const wsAddress = Promise.resolve(`ws://${cloudNodeAddress}`);
        const bridge = new TransportBridge();
        this.addCloudApiConnection(bridge.transportToClient);

        desktopCore.setLocalCloudAddress(wsAddress, new ConnectionToCore(bridge.transportToCore));
        await desktopCore.activatePlugin();
      }
    } finally {
      log.stats('CloudNode.started', {
        parentLogId: startLogId,
        sessionId: null,
      });
    }
  }

  public async close(): Promise<void> {
    if (this.isClosing) return this.isClosing;
    const closeResolvable = new Resolvable<void>();
    this.isClosing = closeResolvable.promise;
    HeroCore.onShutdown = null;
    ShutdownHandler.unregister(this.close);
    try {
      for (const connection of this.connections) {
        await connection.disconnect();
      }
      if (DesktopUtils.isInstalled()) {
        const desktopCore = DesktopUtils.getDesktop();
        desktopCore.setLocalCloudAddress(null, null);
        // Don't shutdown, since we didn't start it
      }
      await DatastoreCore.close();
      await HeroCore.shutdown();
      await ShutdownHandler.run();
      closeResolvable.resolve();
    } catch (error) {
      closeResolvable.reject(error);
    }
    return closeResolvable.promise;
  }

  private addCloudApiConnection(
    transport: ITransportToClient<ICloudApis, ICloudEvents>,
  ): ConnectionToClient<ICloudApis, ICloudEvents, ICloudApiContext> {
    return this.apiRegistry.createConnection(transport, {
      logger: log.createChild(module, {}),
      connectedNodes: 0,
      cloudNodes: 1,
      version: this.cloudNode.version,
    });
  }

  private handleHome(req: IncomingMessage, res: ServerResponse): void {
    res.end(`Ulixee Cloud v${this.cloudNode.version}`);
  }

  private handleRawSocketRequest(
    connectionType: keyof CoreRouter['wsConnectionByType'],
    ws: WebSocket,
    req: IncomingMessage,
  ): void {
    if (connectionType === 'desktopRaw') {
      this.wsConnectionByType[connectionType](ws, req);
    }
    this.connections.add({
      disconnect(): Promise<void> {
        ws.terminate();
        return Promise.resolve();
      },
    } as any);
  }

  private handleSocketRequest(
    connectionType: keyof CoreRouter['wsConnectionByType'],
    ws: WebSocket,
    req: IncomingMessage,
  ): void {
    const transport = new WsTransportToClient(ws, req);
    const connection = this.wsConnectionByType[connectionType](transport, req);
    if (!connection) throw new Error(`Unknown connection protocol attempted "${connectionType}"`);
    this.connections.add(connection);
    connection.once('disconnected', () => this.connections.delete(connection));
  }

  private async handleHttpRequest(
    connectionType: keyof CoreRouter['httpRoutersByType'],
    req: IncomingMessage,
    res: ServerResponse,
    params: string[],
  ): Promise<void | boolean> {
    return await this.httpRoutersByType[connectionType](req, res, params);
  }

  private handleHttpServerDetails(req: IncomingMessage, res: ServerResponse): void {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({ ipAddress: this.serverAddress.ipAddress, port: this.serverAddress.port }),
    );
  }
}

function safeRegisterModule(path: string): void {
  try {
    // eslint-disable-next-line import/no-dynamic-require
    require(path);
  } catch (err) {
    console.warn('Default Datastore Plugin not installed', path, err.message)
  }
}
