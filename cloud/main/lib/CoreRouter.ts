import WebSocket = require('ws');
import Logger from '@ulixee/commons/lib/Logger';
import { toUrl } from '@ulixee/commons/lib/utils';
import IDatastoreCoreConfigureOptions from '@ulixee/datastore-core/interfaces/IDatastoreCoreConfigureOptions';
import ICoreConfigureOptions from '@ulixee/hero-interfaces/ICoreConfigureOptions';
import { ConnectionToClient, ConnectionToCore, TransportBridge } from '@ulixee/net';
import IConnectionToClient from '@ulixee/net/interfaces/IConnectionToClient';
import ITransport from '@ulixee/net/interfaces/ITransport';
import ApiRegistry from '@ulixee/net/lib/ApiRegistry';
import WsTransportToClient from '@ulixee/net/lib/WsTransportToClient';
import IServicesSetup from '@ulixee/platform-specification/types/IServicesSetup';
import { IncomingMessage, ServerResponse } from 'http';
import CloudStatus from '../endpoints/Cloud.status';
import HostedServiceEndpoints from '../endpoints/HostedServiceEndpoints';
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
  private hostedServiceEndpoints: HostedServiceEndpoints; // if host
  private hostedServicesAddress: URL;
  private isClosing: Promise<void>;
  private readonly connections = new Set<IConnectionToClient<any, any>>();

  private cloudApiRegistry = new ApiRegistry<ICloudApiContext>([CloudStatus]);

  private wsConnectionByType = {
    hero: transport => this.cloudNode.heroCore.addConnection(transport),
    datastore: transport => this.cloudNode.datastoreCore.addConnection(transport) as any,
    kad: transport => this.cloudNode.kad.addConnection(transport) as any,
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
    this.cloudNode.publicServer.addWsRoute('/kad', this.handleSocketRequest.bind(this, 'kad'));
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
    if (this.cloudNode.hostedServicesServer) {
      this.hostedServiceEndpoints = new HostedServiceEndpoints();
      this.hostedServicesAddress = this.cloudNode.hostedServicesHostURL;
    }

    this.cloudNode.datastoreCore.registerHttpRoutes(this.addHttpRoute.bind(this));

    if (this.cloudNode.desktopCore) {
      const bridge = new TransportBridge();
      this.cloudApiRegistry.createConnection(bridge.transportToClient, this.getApiContext());
      const loopbackConnection = new ConnectionToCore(bridge.transportToCore);
      this.cloudNode.desktopCore.bindConnection(loopbackConnection);
      this.cloudNode.desktopCore.registerWsRoutes(this.addWsRoute.bind(this));
    }

    if (this.cloudNode.kad) {
      this.cloudNode.kad.on('duplex-created', ({ connectionToClient }) => {
        if (!this.connections.has(connectionToClient)) {
          this.connections.add(connectionToClient);
          connectionToClient.once('disconnected', () => this.connections.delete(connectionToClient));
        }
      });
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

  private addHostedServicesConnection(transport: ITransport): ConnectionToClient<any, any> {
    const connection = this.cloudNode.datastoreCore.addHostedServicesConnection(transport);
    this.hostedServiceEndpoints?.attachToConnection(connection as any, this.getApiContext());
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
      wsOrTransport: ITransport | WebSocket,
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
      hostedServicesAddress: this.hostedServicesAddress,
      nodeAddress: this.nodeAddress,
      version: this.cloudNode.version,
    };
  }

  private handleHome(_req: IncomingMessage, res: ServerResponse): void {
    res.end(`Ulixee Cloud v${this.cloudNode.version}`);
  }

  private async handleRawSocketRequest(
    connectionType: keyof CoreRouter['wsConnectionByType'],
    ws: WebSocket,
    req: IncomingMessage,
  ): Promise<void> {
    await (this.wsConnectionByType[connectionType] as any)(ws, req);
    this.connections.add({
      disconnect(): Promise<void> {
        ws.terminate();
        return Promise.resolve();
      },
    } as any);
  }

  private async handleSocketRequest(
    connectionType: keyof CoreRouter['wsConnectionByType'],
    ws: WebSocket,
    req: IncomingMessage,
  ): Promise<void> {
    const transport = new WsTransportToClient(ws, req);
    const connection = await (this.wsConnectionByType[connectionType] as any)(transport, req);
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

    const { datastoreRegistryHost, storageEngineHost, statsTrackerHost, replayRegistryHost } =
      this.cloudNode.datastoreCore.options;
    const { nodeRegistryHost } = this.cloudNode.cloudConfiguration;

    const settings = <IServicesSetup>{
      datastoreRegistryHost,
      storageEngineHost,
      nodeRegistryHost,
      statsTrackerHost,
      replayRegistryHost,
    };
    res.end(JSON.stringify(settings));
  }
}
