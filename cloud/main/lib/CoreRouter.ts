import WebSocket = require('ws');
import * as http from 'http';
import { IncomingMessage, ServerResponse } from 'http';
import DatastoreCore from '@ulixee/datastore-core';
import { toUrl } from '@ulixee/commons/lib/utils';
import HeroCore from '@ulixee/hero-core';
import IDatastoreCoreConfigureOptions from '@ulixee/datastore-core/interfaces/IDatastoreCoreConfigureOptions';
import WsTransportToClient from '@ulixee/net/lib/WsTransportToClient';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import IConnectionToClient from '@ulixee/net/interfaces/IConnectionToClient';
import ICoreConfigureOptions from '@ulixee/hero-interfaces/ICoreConfigureOptions';
import Logger from '@ulixee/commons/lib/Logger';
import ApiRegistry from '@ulixee/net/lib/ApiRegistry';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import { ConnectionToClient, ConnectionToCore } from '@ulixee/net';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import * as https from 'https';
import IServicesSetup from '@ulixee/platform-specification/types/IServicesSetup';
import IPeerNetwork from '@ulixee/platform-specification/types/IPeerNetwork';
import CloudStatus from '../endpoints/Cloud.status';
import ICloudApiContext, { ICloudConfiguration } from '../interfaces/ICloudApiContext';
import CloudNode from './CloudNode';
import DesktopUtils from './DesktopUtils';
import env from '../env';
import RoutableServer, { IHttpHandleFn } from './RoutableServer';
import NodeRegistry from './NodeRegistry';
import HostedServicesEndpoints from '../endpoints/HostedServicesEndpoints';
import NodeTracker from './NodeTracker';

const { log } = Logger(module);

export default class CoreRouter {
  public static datastorePluginsToRegister = [
    '@ulixee/datastore-plugins-hero-core/register',
    '@ulixee/datastore-plugins-puppeteer-core/register',
  ];

  public heroConfiguration: ICoreConfigureOptions;
  public datastoreConfiguration: Partial<IDatastoreCoreConfigureOptions>;
  public cloudConfiguration: ICloudConfiguration = {
    nodeRegistryHost: env.nodeRegistryHost,
    cloudType: env.cloudType as any,
    dhtBootstrapPeers: env.dhtBootstrapPeers,
    servicesSetupHost: env.servicesSetupHost,
  };

  public peerNetwork?: IPeerNetwork;

  public get dataDir(): string {
    return HeroCore.dataDir;
  }

  public get datastoresDir(): string {
    return DatastoreCore.datastoresDir;
  }

  private nodeAddress: URL;
  private hostedServicesAddress: URL; // if client
  private hostedServicesEndpoints: HostedServicesEndpoints; // if host
  private isClosing: Promise<void>;
  private cloudNode: CloudNode;
  private nodeRegistry: NodeRegistry;
  private nodeTracker: NodeTracker;
  private readonly connections = new Set<IConnectionToClient<any, any>>();

  private cloudApiRegistry = new ApiRegistry<ICloudApiContext>([CloudStatus]);

  private wsConnectionByType = {
    hero: transport => HeroCore.addConnection(transport),
    datastore: transport => DatastoreCore.addConnection(transport) as any,
    services: transport => this.addHostedServicesConnection(transport),
    cloud: transport => this.cloudApiRegistry.createConnection(transport, this.getApiContext()),
  } as const;

  private httpRoutersByType: {
    [key: string]: IHttpHandleFn;
  } = {};

  constructor(cloudNode: CloudNode) {
    this.cloudNode = cloudNode;

    /// CLUSTER APIS /////////////
    cloudNode.hostedServicesServer?.addHttpRoute(
      '/',
      'GET',
      this.handleHostedServicesRoot.bind(this),
    );
    cloudNode.hostedServicesServer?.addWsRoute(
      '/services',
      this.handleSocketRequest.bind(this, 'services'),
    );

    /// PUBLIC APIS /////////////
    cloudNode.publicServer.addWsRoute('/hero', this.handleSocketRequest.bind(this, 'hero'));
    cloudNode.publicServer.addWsRoute(
      '/datastore',
      this.handleSocketRequest.bind(this, 'datastore'),
    );
    cloudNode.publicServer.addHttpRoute(
      '/server-details',
      'GET',
      this.handleHttpServerDetails.bind(this),
    );
    DatastoreCore.registerHttpRoutes(this.addHttpRoute.bind(this, cloudNode));
    // last option
    cloudNode.publicServer.addHttpRoute('/', 'GET', this.handleHome.bind(this));

    for (const module of CoreRouter.datastorePluginsToRegister) {
      safeRegisterModule(module);
    }

    if (DesktopUtils.isInstalled()) {
      DesktopUtils.getDesktop().registerWsRoutes(this.addWsRoute.bind(this, cloudNode));
    }
  }

  public async start(
    publicApiServer: RoutableServer,
    hostedServicesServer?: RoutableServer,
    peerNetwork?: IPeerNetwork,
  ): Promise<void> {
    const cloudNodeAddress = await publicApiServer.host;
    const hostedServicesAddress = await hostedServicesServer?.host;

    const startLogId = log.info('CloudNode.start', {
      cloudNodeAddress,
      hostedServicesAddress,
      sessionId: null,
    });
    try {
      this.nodeAddress = toUrl(cloudNodeAddress);
      this.hostedServicesAddress = toUrl(hostedServicesAddress);
      this.hostedServicesEndpoints = !this.hostedServicesAddress
        ? new HostedServicesEndpoints()
        : null;
      this.peerNetwork = peerNetwork;
      this.nodeTracker = new NodeTracker();
      this.nodeRegistry = new NodeRegistry({
        publicServer: publicApiServer,
        serviceHost: this.hostedServicesAddress,
        peerNetwork: this.peerNetwork,
        nodeTracker: this.nodeTracker,
      });
      await this.nodeRegistry.register(this.nodeAddress, env.networkIdentity);

      /// START HERO
      HeroCore.onShutdown = () => this.cloudNode.close();
      this.heroConfiguration ??= {};
      this.heroConfiguration.shouldShutdownOnSignals ??= this.cloudNode.shouldShutdownOnSignals;
      await HeroCore.start(this.heroConfiguration);

      let servicesSetup: IServicesSetup;
      if (env.servicesSetupHost && this.nodeAddress.host !== env.servicesSetupHost) {
        servicesSetup = await this.getServicesSetup(env.servicesSetupHost);
      }

      /// START DATASTORE
      if (this.datastoreConfiguration) {
        Object.assign(DatastoreCore.options, this.datastoreConfiguration);
      }

      await DatastoreCore.start({
        nodeAddress: this.nodeAddress,
        hostedServicesAddress: this.hostedServicesAddress,
        defaultServices: servicesSetup,
        peerNetwork: this.peerNetwork,
        cloudType: this.cloudConfiguration.cloudType,
      });

      /// START DESKTOP
      if (DesktopUtils.isInstalled()) {
        const desktopCore = DesktopUtils.getDesktop();
        const wsAddress = Promise.resolve(this.nodeAddress.origin);

        const bridge = new TransportBridge();
        this.cloudApiRegistry.createConnection(bridge.transportToClient);
        const loopbackConnection = new ConnectionToCore(bridge.transportToCore);
        desktopCore.setLocalCloudAddress(wsAddress, loopbackConnection);
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

  private async addHostedServicesConnection(
    transport: ITransportToClient<any>,
  ): Promise<ConnectionToClient<any, any>> {
    const connection = await DatastoreCore.addHostedServicesConnection(transport);
    this.hostedServicesEndpoints?.attachToConnection(connection as any, this.getApiContext());
    return connection as any;
  }

  private addHttpRoute(
    cloudNode: CloudNode,
    route: string | RegExp,
    method: 'GET' | 'OPTIONS' | 'POST' | 'UPDATE' | 'DELETE',
    callbackFn: IHttpHandleFn,
  ): void {
    const key = `${method}_${route.toString()}`;
    this.httpRoutersByType[key] = callbackFn;
    this.cloudNode.publicServer.addHttpRoute(route, method, this.handleHttpRequest.bind(this, key));
  }

  private addWsRoute(
    cloudNode: CloudNode,
    route: string | RegExp,
    callbackFn: (
      wsOrTransport: ITransportToClient<any> | WebSocket,
      request: IncomingMessage,
      params: string[],
    ) => any,
    useTransport = true,
  ): void {
    const key = `${route.toString()}`;
    this.wsConnectionByType[key] = callbackFn;
    if (useTransport) {
      this.cloudNode.publicServer.addWsRoute(route, this.handleSocketRequest.bind(this, key));
    } else {
      this.cloudNode.publicServer.addWsRoute(route, this.handleRawSocketRequest.bind(this, key));
    }
  }

  private getApiContext(): ICloudApiContext {
    return {
      logger: log.createChild(module, {}),
      nodeRegistry: this.nodeRegistry,
      nodeTracker: this.nodeTracker,
      cloudConfiguration: this.cloudConfiguration,
      version: this.cloudNode.version,
    };
  }

  private handleHome(_req: IncomingMessage, res: ServerResponse): void {
    res.end(`Ulixee Cloud v${this.cloudNode.version}`);
  }

  private handleRawSocketRequest(
    connectionType: keyof CoreRouter['wsConnectionByType'],
    ws: WebSocket,
    req: IncomingMessage,
  ): void {
    (this.wsConnectionByType[connectionType] as any)(ws, req);
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
    const connection = (this.wsConnectionByType[connectionType] as any)(transport, req);
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

  private handleHttpServerDetails(_: IncomingMessage, res: ServerResponse): void {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ipAddress: this.nodeAddress.hostname, port: this.nodeAddress.port }));
  }

  private handleHostedServicesRoot(_: IncomingMessage, res: ServerResponse): void {
    res.setHeader('Content-Type', 'application/json');

    const { datastoreRegistryHost, storageEngineHost, statsTrackerHost } = DatastoreCore.options;
    const { nodeRegistryHost } = this.cloudConfiguration;

    const settings = <IServicesSetup>{
      datastoreRegistryHost,
      storageEngineHost,
      nodeRegistryHost,
      statsTrackerHost,
    };
    res.end(JSON.stringify(settings));
  }

  private getServicesSetup(servicesHost: string): Promise<IServicesSetup> {
    // default to http
    if (!servicesHost.includes('://')) servicesHost = `http://${servicesHost}`;

    const url = new URL('/', servicesHost);
    const httpModule = url.protocol === 'http:' ? http : https;

    return new Promise<IServicesSetup>((resolve, reject) => {
      httpModule
        .get(url, async res => {
          res.on('error', reject);
          res.setEncoding('utf8');
          try {
            let result = '';
            for await (const chunk of res) {
              result += chunk;
            }
            resolve(JSON.parse(result));
          } catch (err) {
            reject(err);
          }
        })
        .on('error', reject)
        .end();
    });
  }
}

function safeRegisterModule(path: string): void {
  try {
    // eslint-disable-next-line import/no-dynamic-require
    require(path);
  } catch (err) {
    // NOTE: don't show this by default
    // console.warn('Default Datastore Plugin not installed', path, err.message);
  }
}
