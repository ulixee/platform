import { app, dialog, ipcMain, Menu, screen } from 'electron';
import { EventEmitter } from 'events';
import * as Http from 'http';
import * as Path from 'path';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import IChromeAliveEvents from '@ulixee/apps-chromealive-interfaces/events';
import { httpGet } from '@ulixee/commons/lib/downloadFile';
import { IChromeAliveAppApis } from '@ulixee/apps-chromealive-interfaces/apis';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import { ClientOptions } from 'ws';
import * as Os from 'os';
import WebSocket = require('ws');
import ChromeAliveApi from './ChromeAliveApi';
import generateAppMenu from '../menus/generateAppMenu';
import StaticServer from './StaticServer';
import ChromeAliveWindow from './ChromeAliveWindow';

const { version } = require('../package.json');

export class ChromeAlive extends EventEmitter {
  readonly #staticServer: StaticServer;
  get activeWindow(): ChromeAliveWindow {
    return this.windows[this.activeWindowIdx];
  }

  windows: ChromeAliveWindow[] = [];
  activeWindowIdx = 0;
  #windowsBySessionId = new Map<string, ChromeAliveWindow>();
  #debuggerUrl: string;

  #apiByMinerAddress = new Map<
    string,
    {
      api: ChromeAliveApi<IChromeAliveAppApis>;
      id: string;
      wsToCore: WebSocket;
      wsToDevtoolsProtocol: WebSocket;
    }
  >();

  #exited = false;
  events = new EventSubscriber();

  constructor(private minerAddress?: string) {
    super();
    const minerAddressInArgv = process.argv
      .find(x => x.startsWith('--minerAddress='))
      ?.replace('--minerAddress=', '')
      ?.replace(/"/g, '');

    this.minerAddress ??= this.formatMinerAddress(
      minerAddressInArgv ?? UlixeeHostsConfig.global.getVersionHost(version),
    );

    app.name = 'ChromeAlive!';
    (process.env as any).ELECTRON_DISABLE_SECURITY_WARNINGS = true;
    app.commandLine.appendSwitch('remote-debugging-port', '8315');

    app.setAppLogsPath();

    this.#staticServer = new StaticServer(Path.resolve(__dirname, '..', 'ui'));

    void this.appReady();
  }

  private appExit(): void {
    if (this.#exited) return;
    this.#exited = true;

    this.events.close();
    console.warn('EXITING CHROMEALIVE!');
    for (const connection of this.#apiByMinerAddress.values()) {
      void connection.api.disconnect().catch(() => null);
    }
    this.#apiByMinerAddress.clear();
    app.exit();
  }

  private async appReady(): Promise<void> {
    try {
      await app.whenReady();
      Menu.setApplicationMenu(
        generateAppMenu({
          replayControl: this.replayControl.bind(this),
          getSessionPath: this.getSessionPath.bind(this),
        }),
      );
      this.bindIpcEvents();
      await this.#staticServer.load();
      app.once('before-quit', () => this.appExit());
      ShutdownHandler.register(() => this.appExit());
      await this.getDebuggerUrl();

      this.events.on(UlixeeHostsConfig.global, 'change', this.onNewMinerHost.bind(this));
      await this.connectToMiner(this.minerAddress);

      this.emit('ready');
    } catch (error) {
      console.error('ERROR in appReady: ', error);
    }
  }

  private async onNewMinerHost(): Promise<void> {
    const newAddress = UlixeeHostsConfig.global.getVersionHost(version);
    if (!newAddress) return;
    if (this.minerAddress !== newAddress) {
      const oldAddress = this.minerAddress;
      this.minerAddress = this.formatMinerAddress(newAddress);
      // eslint-disable-next-line no-console
      console.log('Connecting to local miner', this.minerAddress);
      await this.connectToMiner(this.minerAddress);
      for (const window of this.windows) {
        if (window.minerAddress.startsWith(oldAddress)) {
          await window.reconnect(this.minerAddress);
        }
      }
    }
  }

  private async connectToMiner(address: string): Promise<void> {
    if (!address) return;
    const api = new ChromeAliveApi<IChromeAliveAppApis>(
      address,
      this.onChromeAliveEvent.bind(this, address),
    );
    await api.connect();
    this.events.once(api, 'close', this.onApiClosed.bind(this, address));
    const mainScreen = screen.getPrimaryDisplay();
    const workarea = mainScreen.workArea;
    const workareaBounds = {
      left: workarea.x,
      top: workarea.y,
      ...workarea,
      scale: mainScreen.scaleFactor,
    };
    const { id } = await api.send('App.connect', {
      workarea: workareaBounds,
    });

    let url: URL;
    try {
      url = new URL(`/chromealive-devtools`, api.transport.host);
      url.searchParams.set('id', id);
    } catch (error) {
      console.error('Invalid ChromeAlive Devtools URL', error, { address });
    }
    // pipe connection
    const wsToCore = await this.connectToWebSocket(url.href, { perMessageDeflate: true });
    const wsToDevtoolsProtocol = await this.connectToWebSocket(this.#debuggerUrl);
    wsToDevtoolsProtocol.on('message', msg => wsToCore.send(msg));
    wsToCore.on('message', msg => wsToDevtoolsProtocol.send(msg));

    this.events.once(wsToCore, 'close', this.onApiClosed.bind(this, address));
    this.events.on(wsToCore, 'error', this.onDevtoolsError.bind(this, wsToCore));
    this.events.once(wsToDevtoolsProtocol, 'close', this.onApiClosed.bind(this, address));
    this.events.on(wsToDevtoolsProtocol, 'error', this.onDevtoolsError.bind(this, wsToCore));

    this.#apiByMinerAddress.set(address, { id, api, wsToCore, wsToDevtoolsProtocol });
  }

  private onDevtoolsError(ws: WebSocket, error: Error): void {
    console.warn('ERROR in devtools websocket with Core at %s', ws.url, error);
  }

  private onApiClosed(address: string): void {
    console.warn('Api Disconnected', address);
    const api = this.#apiByMinerAddress.get(address);
    if (api?.api.isConnected) void api.api.disconnect();
    this.#apiByMinerAddress.delete(address);
  }

  private replayControl(direction: 'back' | 'forward'): void {
    void this.activeWindow?.replayControl(direction);
  }

  private getSessionPath(): string {
    return this.activeWindow?.session.dbPath;
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

  private bindIpcEvents(): void {
    ipcMain.on('open-file', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'showHiddenFiles'],
        defaultPath: Path.join(Os.tmpdir(), '.ulixee', 'hero-sessions'),
        filters: [
          // { name: 'All Files', extensions: ['js', 'ts', 'db'] },
          { name: 'Session Database', extensions: ['db'] },
          // { name: 'Javascript', extensions: ['js'] },
          // { name: 'Typescript', extensions: ['ts'] },
        ],
      });
      if (result.filePaths.length) {
        const [filename] = result.filePaths;
        if (filename.endsWith('.db')) {
          return this.loadChromeAliveWindow(this.minerAddress, {
            dbPath: filename,
            heroSessionId: Path.basename(filename).replace('.db', ''),
          });
        }
        // const sessionContainerDir = Path.dirname(filename);
        // TODO: show relevant sessions
      }
    });
  }

  private onChromeAliveEvent<T extends keyof IChromeAliveEvents & string>(
    minerAddress: string,
    eventType: T,
    data: IChromeAliveEvents[T],
  ): void {
    if (this.#exited) return;

    if (eventType === 'Session.opened') {
      void this.loadChromeAliveWindow(minerAddress, data as any);
    }

    if (eventType === 'App.quit') {
      const apis = this.#apiByMinerAddress.get(minerAddress);
      if (apis) {
        void apis.api?.disconnect();
        apis.wsToCore?.close();
        apis.wsToDevtoolsProtocol?.close();
      }
    }
  }

  private async loadChromeAliveWindow(
    minerAddress: string,
    data: { heroSessionId: string; dbPath: string },
  ): Promise<void> {
    if (this.#windowsBySessionId.has(data.heroSessionId)) return;
    const chromeAliveWindow = new ChromeAliveWindow(data, this.#staticServer, minerAddress);

    const { heroSessionId } = data;
    this.windows.push(chromeAliveWindow);
    this.#windowsBySessionId.set(heroSessionId, chromeAliveWindow);
    await chromeAliveWindow
      .load()
      .catch(err => console.error('Error Loading ChromeAlive window', err));

    this.events.on(chromeAliveWindow.window, 'focus', this.focusWindow.bind(this, heroSessionId));
    this.events.on(chromeAliveWindow.window, 'close', this.closeWindow.bind(this, heroSessionId));
  }

  private closeWindow(heroSessionId: string): void {
    const chromeAliveWindow = this.#windowsBySessionId.get(heroSessionId);
    if (!chromeAliveWindow) return;
    this.#windowsBySessionId.delete(heroSessionId);
    const idx = this.windows.indexOf(chromeAliveWindow);
    if (idx === this.activeWindowIdx) {
      this.activeWindowIdx = 0;
    }
    this.windows.splice(idx, 1);
  }

  private focusWindow(heroSessionId: string): void {
    const chromeAliveWindow = this.#windowsBySessionId.get(heroSessionId);
    if (chromeAliveWindow) this.activeWindowIdx = this.windows.indexOf(chromeAliveWindow);
  }

  private async getDebuggerUrl(): Promise<void> {
    const res = await new Promise<Http.IncomingMessage>(resolve =>
      httpGet(`http://localhost:8315/json/version`, resolve),
    );
    res.setEncoding('utf8');
    let jsonString = '';
    for await (const chunk of res) jsonString += chunk;
    const debugEndpoints = JSON.parse(jsonString);

    this.#debuggerUrl = debugEndpoints.webSocketDebuggerUrl;
  }

  private formatMinerAddress(host: string): string {
    if (!host) return host;
    if (host.endsWith('/')) host = host.slice(-1);
    if (!host.endsWith('/chromealive')) {
      host += '/chromealive';
    }
    if (!host.includes('://')) {
      host = `ws://${host}`;
    }
    return host;
  }
}
