import IDesktopAppEvents from '@ulixee/desktop-interfaces/events/IDesktopAppEvents';
import { IDesktopAppApis } from '@ulixee/desktop-interfaces/apis';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import { screen } from 'electron';
import { ClientOptions } from 'ws';
import * as http from 'http';
import { CloudNode } from '@ulixee/cloud';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import QueryLog from '@ulixee/datastore/lib/QueryLog';
import { ICloudConnected } from '@ulixee/desktop-interfaces/apis/IDesktopApis';
import IDatastoreDeployLogEntry from '@ulixee/datastore-core/interfaces/IDatastoreDeployLogEntry';
import * as Path from 'path';
import DatastoreCore from '@ulixee/datastore-core';
import IQueryLogEntry from '@ulixee/datastore/interfaces/IQueryLogEntry';
import LocalUserProfile from '@ulixee/datastore/lib/LocalUserProfile';
import { AddressInfo } from 'net';
import DesktopCore from '@ulixee/desktop-core';
import WebSocket = require('ws');
import { toUrl } from '@ulixee/commons/lib/utils';
import ApiClient from './ApiClient';
import ArgonFile, { IArgonFile } from './ArgonFile';
import DeploymentWatcher from './DeploymentWatcher';
import PrivateDesktopApiHandler from './PrivateDesktopApiHandler';

const { version } = require('../package.json');

const bundledDatastoreExample = Path.join(__dirname, '../assets/ulixee-docs.dbx.tgz');

export default class ApiManager<
  TEventType extends keyof IDesktopAppEvents & string = keyof IDesktopAppEvents,
> extends TypedEventEmitter<{
  'api-event': {
    cloudAddress: string;
    eventType: TEventType;
    data: IDesktopAppEvents[TEventType];
  };
  'new-cloud-address': ICloudConnected;
  'argon-file-opened': IArgonFile;
  deployment: IDatastoreDeployLogEntry;
  query: IQueryLogEntry;
}> {
  apiByCloudAddress = new Map<
    string,
    {
      name: string;
      adminIdentity?: string;
      cloudNodes: number;
      type: 'local' | 'public' | 'private';
      resolvable: Resolvable<IApiGroup>;
    }
  >();

  localCloud: CloudNode;
  exited = false;
  events = new EventSubscriber();
  localCloudAddress: string;
  debuggerUrl: string;
  localUserProfile: LocalUserProfile;
  deploymentWatcher: DeploymentWatcher;
  queryLogWatcher: QueryLog;
  privateDesktopApiHandler: PrivateDesktopApiHandler;
  privateDesktopWsServer: WebSocket.Server;
  privateDesktopWsServerAddress: string;

  datastoreApiClientsByAddress: { [address: string]: DatastoreApiClient } = {};

  constructor() {
    super();
    this.localUserProfile = new LocalUserProfile();
    this.deploymentWatcher = new DeploymentWatcher();
    this.queryLogWatcher = new QueryLog();
    this.privateDesktopApiHandler = new PrivateDesktopApiHandler(this);
  }

  public async start(): Promise<void> {
    this.debuggerUrl = await this.getDebuggerUrl();
    this.privateDesktopWsServer = new WebSocket.Server({ port: 0 });
    this.events.on(
      this.privateDesktopWsServer,
      'connection',
      this.handlePrivateApiWsConnection.bind(this),
    );
    this.privateDesktopWsServerAddress = await new Promise<string>(resolve => {
      this.privateDesktopWsServer.once('listening', () => {
        const address = this.privateDesktopWsServer.address() as AddressInfo;
        resolve(`ws://127.0.0.1:${address.port}`);
      });
    });
    if (!this.localUserProfile.defaultAddress) {
      // TODO: move this to a welcome screen!!
      await this.localUserProfile.createDefaultArgonAddress();
    }
    if (!this.localUserProfile.defaultAdminIdentityPath) {
      await this.localUserProfile.createDefaultAdminIdentity();
    }
    this.deploymentWatcher.start();
    this.queryLogWatcher.monitor(x => this.emit('query', x));
    await this.startLocalCloud();
    this.events.on(UlixeeHostsConfig.global, 'change', this.onNewLocalCloudAddress.bind(this));
    this.events.on(this.deploymentWatcher, 'new', x => this.emit('deployment', x));
    for (const cloud of this.localUserProfile.clouds) {
      await this.connectToCloud({
        ...cloud,
        adminIdentity: cloud.adminIdentity,
        type: 'private',
      });
    }
  }

  public async close(): Promise<void> {
    if (this.exited) return;
    this.exited = true;

    await DesktopCore.shutdown();
    this.privateDesktopWsServer.close();
    await this.privateDesktopApiHandler.close();
    this.events.close('error');
    for (const connection of this.apiByCloudAddress.values()) {
      await this.closeApiGroup(connection.resolvable);
    }
    for (const client of Object.values(this.datastoreApiClientsByAddress)) {
      await client.disconnect();
    }
    this.apiByCloudAddress.clear();
    this.deploymentWatcher.stop();
    await this.queryLogWatcher.close();
  }

  public async stopLocalCloud(): Promise<void> {
    await this.localCloud?.close();
    this.localCloud = null;
  }

  public async startLocalCloud(): Promise<void> {
    let localCloudAddress = UlixeeHostsConfig.global.getVersionHost(version);

    localCloudAddress = await UlixeeHostsConfig.global.checkLocalVersionHost(
      version,
      localCloudAddress,
    );
    let adminIdentity: string;
    if (!localCloudAddress) {
      adminIdentity = this.localUserProfile.defaultAdminIdentity.bech32;
      await DatastoreCore.installCompressedDbx(bundledDatastoreExample);
      this.localCloud ??= new CloudNode('localhost', { shouldShutdownOnSignals: false });
      this.localCloud.router.datastoreConfiguration ??= {};
      this.localCloud.router.datastoreConfiguration.cloudAdminIdentities ??= [];
      this.localCloud.router.datastoreConfiguration.cloudAdminIdentities.push(adminIdentity);
      await this.localCloud.listen();
      localCloudAddress = await this.localCloud.address;
    }
    await this.connectToCloud({ address: localCloudAddress, type: 'local', adminIdentity });
  }

  public getDatastoreClient(cloudHost: string): DatastoreApiClient {
    const hostUrl = toUrl(cloudHost);
    this.datastoreApiClientsByAddress[cloudHost] ??= new DatastoreApiClient(hostUrl.origin);
    return this.datastoreApiClientsByAddress[cloudHost];
  }

  public getCloudAddressByName(name: string): string {
    for (const [address, entry] of this.apiByCloudAddress) {
      if (entry.name === name) return address;
    }
  }

  public async connectToCloud(cloud: {
    address: string;
    adminIdentity?: string;
    type: 'public' | 'private' | 'local';
    name?: string;
    oldAddress?: string;
  }): Promise<void> {
    const { adminIdentity, oldAddress, type } = cloud;
    let { address, name } = cloud;
    if (!address) return;
    name ??= type;
    address = this.formatCloudAddress(address);
    if (this.apiByCloudAddress.has(address)) {
      await this.apiByCloudAddress.get(address).resolvable.promise;
      return;
    }
    try {
      this.apiByCloudAddress.set(address, {
        name: name ?? type,
        adminIdentity,
        type,
        cloudNodes: 0,
        resolvable: new Resolvable(),
      });

      const api = new ApiClient<IDesktopAppApis, IDesktopAppEvents>(
        `${address}?type=app`,
        this.onDesktopEvent.bind(this, address),
      );
      await api.connect();
      const onApiClosed = this.events.once(api, 'close', this.onApiClosed.bind(this, address));

      const mainScreen = screen.getPrimaryDisplay();
      const workarea = mainScreen.workArea;
      const { id, cloudNodes } = await api.send('App.connect', {
        workarea: {
          left: workarea.x,
          top: workarea.y,
          ...workarea,
          scale: mainScreen.scaleFactor,
        },
      });
      const cloudApi = this.apiByCloudAddress.get(address);
      cloudApi.cloudNodes = cloudNodes ?? 0;

      let url: URL;
      try {
        url = new URL(`/desktop-devtools`, api.transport.host);
        url.searchParams.set('id', id);
      } catch (error) {
        console.error('Invalid ChromeAlive Devtools URL', error, { address });
      }
      // pipe connection
      const [wsToCore, wsToDevtoolsProtocol] = await Promise.all([
        this.connectToWebSocket(url.href, { perMessageDeflate: true }),
        this.connectToWebSocket(this.debuggerUrl),
      ]);
      const events = [
        this.events.on(wsToCore, 'message', msg => wsToDevtoolsProtocol.send(msg)),
        this.events.on(wsToCore, 'error', this.onDevtoolsError.bind(this, wsToCore)),
        this.events.once(wsToCore, 'close', this.onApiClosed.bind(this, address)),
        this.events.on(wsToDevtoolsProtocol, 'message', msg => wsToCore.send(msg)),
        this.events.on(
          wsToDevtoolsProtocol,
          'error',
          this.onDevtoolsError.bind(this, wsToDevtoolsProtocol),
        ),
        this.events.once(wsToDevtoolsProtocol, 'close', this.onApiClosed.bind(this, address)),
      ];
      this.events.group(`ws-${address}`, onApiClosed, ...events);
      cloudApi.resolvable.resolve({
        id,
        api,
        wsToCore,
        wsToDevtoolsProtocol,
      });
      this.emit('new-cloud-address', {
        address,
        adminIdentity,
        name,
        cloudNodes,
        type,
        oldAddress,
      });
    } catch (error) {
      this.apiByCloudAddress.get(address)?.resolvable.reject(error, true);
      throw error;
    }
  }

  public async onArgonFileOpened(file: string): Promise<void> {
    const argonFile = await ArgonFile.readFromPath(file);
    if (argonFile) {
      this.emit('argon-file-opened', argonFile);
    }
  }

  private onDesktopEvent(
    cloudAddress: string,
    eventType: TEventType,
    data: IDesktopAppEvents[TEventType],
  ): void {
    if (this.exited) return;

    if (eventType === 'Session.opened') {
      this.emit('api-event', { cloudAddress, eventType, data });
    }

    if (eventType === 'App.quit') {
      const apis = this.apiByCloudAddress.get(cloudAddress);
      if (apis) {
        void this.closeApiGroup(apis.resolvable);
      }
    }
  }

  private onDevtoolsError(ws: WebSocket, error: Error): void {
    console.warn('ERROR in devtools websocket with Core at %s', ws.url, error);
  }

  private async onNewLocalCloudAddress(): Promise<void> {
    const newAddress = UlixeeHostsConfig.global.getVersionHost(version);
    if (!newAddress) return;
    if (this.localCloudAddress !== newAddress) {
      const oldAddress = this.localCloudAddress;
      this.localCloudAddress = this.formatCloudAddress(newAddress);
      // eslint-disable-next-line no-console
      console.log('Desktop app connecting to local cloud', this.localCloudAddress);
      await this.connectToCloud({
        address: this.localCloudAddress,
        adminIdentity: this.localUserProfile.defaultAdminIdentity?.bech32,
        name: 'local',
        type: 'local',
        oldAddress,
      });
    }
  }

  private onApiClosed(address: string): void {
    console.warn('Api Disconnected', address);
    const api = this.apiByCloudAddress.get(address);
    this.events.endGroup(`ws-${address}`);
    if (api) {
      void this.closeApiGroup(api.resolvable);
    }
    this.apiByCloudAddress.delete(address);
  }

  private async closeApiGroup(group: Resolvable<IApiGroup>): Promise<void> {
    const { api, wsToCore, wsToDevtoolsProtocol } = await group;
    if (api.isConnected) await api.disconnect();
    wsToCore?.close();
    return wsToDevtoolsProtocol?.close();
  }

  private async connectToWebSocket(host: string, options?: ClientOptions): Promise<WebSocket> {
    const ws = new WebSocket(host, options);
    await new Promise<void>((resolve, reject) => {
      const closeEvents = [
        this.events.once(ws, 'close', reject),
        this.events.once(ws, 'error', reject),
      ];
      this.events.once(ws, 'open', () => {
        this.events.off(...closeEvents);
        resolve();
      });
    });
    return ws;
  }

  private handlePrivateApiWsConnection(ws: WebSocket, req: http.IncomingMessage): void {
    this.privateDesktopApiHandler.onConnection(ws, req);
  }

  private async getDebuggerUrl(): Promise<string> {
    const responseBody = await new Promise<string>((resolve, reject) => {
      const request = http.get(
        `http://127.0.0.1:${process.env.DEVTOOLS_PORT}/json/version`,
        async res => {
          let jsonString = '';
          res.setEncoding('utf8');
          for await (const chunk of res) jsonString += chunk;
          resolve(jsonString);
        },
      );
      request.once('error', reject);
      request.end();
    });
    const debugEndpoints = JSON.parse(responseBody);

    return debugEndpoints.webSocketDebuggerUrl;
  }

  private formatCloudAddress(host: string): string {
    const url = toUrl(host);
    url.pathname = '/desktop';
    return url.href;
  }
}

interface IApiGroup {
  api: ApiClient<IDesktopAppApis, IDesktopAppEvents>;
  id: string;
  wsToCore: WebSocket;
  wsToDevtoolsProtocol: WebSocket;
}
