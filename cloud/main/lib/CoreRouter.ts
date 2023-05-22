import WebSocket = require('ws');
import Logger from '@ulixee/commons/lib/Logger';
import { toUrl } from '@ulixee/commons/lib/utils';
import IDatastoreCoreConfigureOptions from '@ulixee/datastore-core/interfaces/IDatastoreCoreConfigureOptions';
import HeroCore from '@ulixee/hero-core';
import ICoreConfigureOptions from '@ulixee/hero-interfaces/ICoreConfigureOptions';
import { ConnectionToClient, ConnectionToCore, TransportBridge } from '@ulixee/net';
import IConnectionToClient from '@ulixee/net/interfaces/IConnectionToClient';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import ApiRegistry from '@ulixee/net/lib/ApiRegistry';
import WsTransportToClient from '@ulixee/net/lib/WsTransportToClient';
import IServicesSetup from '@ulixee/platform-specification/types/IServicesSetup';
import { IncomingMessage, ServerResponse } from 'http';
import CloudStatus from '../endpoints/Cloud.status';
import NodeRegistryEndpoints from '../endpoints/NodeRegistryEndpoints';
import ICloudApiContext from '../interfaces/ICloudApiContext';
import CloudNode from './CloudNode';
import { IHttpHandleFn } from './RoutableServer';

const { log } = Logger(module);

export default class CoreRouter {
  // @deprecated - use CloudNode.datastoreConfiguration
  public set datastoreConfiguration(value: Partial<IDatastoreCoreConfigureOptions>) {
    this.cloudNode.datastoreConfiguration = value;
  }

  // @deprecated - use CloudNode.heroConfiguration
  public set heroConfiguration(value: ICoreConfigureOptions) {
    this.cloudNode.heroConfiguration = value;
  }

  private nodeAddress: URL;
  private nodeRegistryEndpoints: NodeRegistryEndpoints; // if host
  private isClosing: Promise<void>;
  private readonly connections = new Set<IConnectionToClient<any, any>>();

  private cloudApiRegistry = new ApiRegistry<ICloudApiContext>([CloudStatus]);

  private wsConnectionByType = {
    hero: transport => HeroCore.addConnection(transport),
    datastore: transport => this.cloudNode.datastoreCore.addConnection(transport) as any,
    services: transport => this.addHostedServicesConnection(transport),
    cloud: transport => this.cloudApiRegistry.createConnection(transport, this.getApiContext()),
  } as const;

  private httpRoutersByType: {
    [key: string]: IHttpHandleFn;
  } = {};

  constructor(private cloudNode: CloudNode) {}

  public async register(): Promise<void> {
    const cloudNodeAddress = await this.cloudNode.address;

    /// CLUSTER APIS /////////////
    this.cloudNode.hostedServicesServer?.addHttpRoute(
      '/',
      'GET',
      this.handleHostedServicesRoot.bind(this),
    );
    this.cloudNode.hostedServicesServer?.addWsRoute(
      '/services',
      this.handleSocketRequest.bind(this, 'services'),
    );

    /// PUBLIC APIS /////////////
    this.cloudNode.publicServer.addWsRoute('/hero', this.handleSocketRequest.bind(this, 'hero'));
    this.cloudNode.publicServer.addWsRoute(
      '/datastore',
      this.handleSocketRequest.bind(this, 'datastore'),
    );
    this.cloudNode.publicServer.addHttpRoute(
      '/server-details',
      'GET',
      this.handleHttpServerDetails.bind(this),
    );
    this.nodeAddress = toUrl(cloudNodeAddress);
    if (this.cloudNode.hostedServicesServer)
      this.nodeRegistryEndpoints = new NodeRegistryEndpoints();

    this.cloudNode.datastoreCore.registerHttpRoutes(this.addHttpRoute.bind(this));

    if (this.cloudNode.desktopCore) {
      const bridge = new TransportBridge();
      this.cloudApiRegistry.createConnection(bridge.transportToClient, this.getApiContext());
      const loopbackConnection = new ConnectionToCore(bridge.transportToCore);
      this.cloudNode.desktopCore.bindConnection(loopbackConnection);
      this.cloudNode.desktopCore.registerWsRoutes(this.addWsRoute.bind(this));
    }

    // last option
    this.cloudNode.publicServer.addHttpRoute('/', 'GET', this.handleHome.bind(this));
  }

  public async close(): Promise<void> {
    this.isClosing ??= Promise.allSettled([...this.connections].map(x => x.disconnect())).then(
      () => null,
    );
    return this.isClosing;
  }

  private addHostedServicesConnection(
    transport: ITransportToClient<any>,
  ): ConnectionToClient<any, any> {
    const connection = this.cloudNode.datastoreCore.addHostedServicesConnection(transport);
    this.nodeRegistryEndpoints?.attachToConnection(connection as any, this.getApiContext());
    return connection as any;
  }

  private addHttpRoute(
    route: string | RegExp,
    method: 'GET' | 'OPTIONS' | 'POST' | 'UPDATE' | 'DELETE',
    callbackFn: IHttpHandleFn,
  ): void {
    const key = `${method}_${route.toString()}`;
    this.httpRoutersByType[key] = callbackFn;
    this.cloudNode.publicServer.addHttpRoute(route, method, this.handleHttpRequest.bind(this, key));
  }

  private addWsRoute(
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
      nodeRegistry: this.cloudNode.nodeRegistry,
      nodeTracker: this.cloudNode.nodeTracker,
      cloudConfiguration: this.cloudNode.cloudConfiguration,
      datastoreConfiguration: this.cloudNode.datastoreCore.options,
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
    if (!connection) {
      throw new Error(`Unknown connection protocol attempted "${connectionType}"`);
    }
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

    const { datastoreRegistryHost, storageEngineHost, statsTrackerHost } =
      this.cloudNode.datastoreCore.options;
    const { nodeRegistryHost } = this.cloudNode.cloudConfiguration;

    const settings = <IServicesSetup>{
      datastoreRegistryHost,
      storageEngineHost,
      nodeRegistryHost,
      statsTrackerHost,
    };
    res.end(JSON.stringify(settings));
  }
}
