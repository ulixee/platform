import IDesktopAppEvents from '@ulixee/desktop-interfaces/events/IDesktopAppEvents';
import { IDesktopAppApis } from '@ulixee/desktop-interfaces/apis';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import { app, screen } from 'electron';
import { ClientOptions } from 'ws';
import * as Http from 'http';
import { httpGet } from '@ulixee/commons/lib/downloadFile';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import WebSocket = require('ws');
import ApiClient from './ApiClient';

const { version } = require('../package.json');

export default class ApiManager<
  TEventType extends keyof IDesktopAppEvents & string = keyof IDesktopAppEvents,
> extends TypedEventEmitter<{
  'api-event': {
    minerAddress: string;
    eventType: TEventType;
    data: IDesktopAppEvents[TEventType];
  };
  'new-miner-address': {
    oldAddress?: string;
    isLocal: boolean;
    newAddress: string;
  };
}> {
  public apiByMinerAddress = new Map<
    string,
    {
      api: ApiClient<IDesktopAppApis, IDesktopAppEvents>;
      id: string;
      wsToCore: WebSocket;
      wsToDevtoolsProtocol: WebSocket;
    }
  >();

  exited = false;
  events = new EventSubscriber();
  localMinerAddress: string;
  debuggerUrl: string;

  constructor() {
    super();
    app.commandLine.appendSwitch('remote-debugging-port', '8315');
    this.events.on(UlixeeHostsConfig.global, 'change', this.onNewLocalMinerHost.bind(this));
  }

  public async start(localMinerAddress: string): Promise<void> {
    this.debuggerUrl = await this.getDebuggerUrl();
    this.localMinerAddress = localMinerAddress ?? UlixeeHostsConfig.global.getVersionHost(version);
    if (this.localMinerAddress) {
      await this.connectToMiner(this.localMinerAddress);
    }
  }

  public close(): void {
    if (this.exited) return;
    this.exited = true;

    this.events.close('error');
    for (const connection of this.apiByMinerAddress.values()) {
      void connection.api.disconnect().catch(() => null);
    }
    this.apiByMinerAddress.clear();
  }

  public async connectToMiner(address: string, oldAddress?: string): Promise<void> {
    if (!address) return;

    address = this.formatMinerAddress(address);

    const api = new ApiClient<IDesktopAppApis, IDesktopAppEvents>(
      address,
      this.onDesktopEvent.bind(this, address),
    );
    await api.connect();
    const onApiClosed = this.events.once(api, 'close', this.onApiClosed.bind(this, address));

    const mainScreen = screen.getPrimaryDisplay();
    const workarea = mainScreen.workArea;
    const { id } = await api.send('App.connect', {
      workarea: {
        left: workarea.x,
        top: workarea.y,
        ...workarea,
        scale: mainScreen.scaleFactor,
      },
    });

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
    this.apiByMinerAddress.set(address, { id, api, wsToCore, wsToDevtoolsProtocol });
    this.emit('new-miner-address', { newAddress: address, isLocal: id === 'local', oldAddress });
  }

  private onDesktopEvent(
    minerAddress: string,
    eventType: TEventType,
    data: IDesktopAppEvents[TEventType],
  ): void {
    if (this.exited) return;

    if (eventType === 'Session.opened') {
      this.emit('api-event', { minerAddress, eventType, data });
    }

    if (eventType === 'App.quit') {
      const apis = this.apiByMinerAddress.get(minerAddress);
      if (apis) {
        void apis.api?.disconnect();
        apis.wsToCore?.close();
        apis.wsToDevtoolsProtocol?.close();
      }
    }
  }

  private onDevtoolsError(ws: WebSocket, error: Error): void {
    console.warn('ERROR in devtools websocket with Core at %s', ws.url, error);
  }

  private async onNewLocalMinerHost(): Promise<void> {
    const newAddress = UlixeeHostsConfig.global.getVersionHost(version);
    if (!newAddress) return;
    if (this.localMinerAddress !== newAddress) {
      const oldAddress = this.localMinerAddress;
      this.localMinerAddress = this.formatMinerAddress(newAddress);
      // eslint-disable-next-line no-console
      console.log('Connecting to local miner', this.localMinerAddress);
      await this.connectToMiner(this.localMinerAddress, oldAddress);
    }
  }

  private onApiClosed(address: string): void {
    console.warn('Api Disconnected', address);
    const api = this.apiByMinerAddress.get(address);
    this.events.endGroup(`ws-${address}`);
    if (api) {
      if (api.api.isConnected) void api.api.disconnect();
      api.wsToCore?.close();
      api.wsToDevtoolsProtocol?.close();
    }
    this.apiByMinerAddress.delete(address);
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

  private async getDebuggerUrl(): Promise<string> {
    const res = await new Promise<Http.IncomingMessage>(resolve =>
      httpGet(`http://localhost:8315/json/version`, resolve),
    );
    res.setEncoding('utf8');
    let jsonString = '';
    for await (const chunk of res) jsonString += chunk;
    const debugEndpoints = JSON.parse(jsonString);

    return debugEndpoints.webSocketDebuggerUrl;
  }

  private formatMinerAddress(host: string): string {
    if (!host) return host;
    if (host.endsWith('/')) host = host.slice(-1);
    if (!host.endsWith('/desktop')) {
      host += '/desktop';
    }
    if (!host.includes('://')) {
      host = `ws://${host}`;
    }
    return host;
  }
}
