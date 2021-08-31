import { app, BrowserWindow, screen } from 'electron';
import { EventEmitter } from 'events';
import { Server as StaticServer } from 'node-static';
import * as Http from 'http';
import { AddressInfo } from 'net';
import * as Path from 'path';
import * as Fs from 'fs';
import * as ContextMenu from 'electron-context-menu';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import IChromeAliveEvents from '@ulixee/apps-chromealive-interfaces/events';
import ChromeAliveApi from './ChromeAliveApi';

export class ChromeAlive extends EventEmitter {
  readonly #vueServer: Http.Server;
  #browserWindow: BrowserWindow;
  #isVisible: boolean; // track visibility
  #vueAddress: Promise<AddressInfo>;
  #resetAlwaysTopTimeout: NodeJS.Timeout;
  #hideOnLaunch = false;
  #nsEventMonitor: any;
  #mouseDown: boolean;

  #api: ChromeAliveApi;

  constructor(readonly coreServerAddress?: string) {
    super();
    this.#isVisible = false;
    this.coreServerAddress ??= process.argv
      .find(x => x.startsWith('--coreServerAddress='))
      ?.replace('--coreServerAddress=', '');

    this.#hideOnLaunch = process.argv.some(x => x === '--hide');

    // hide the dock icon if it shows
    if (process.platform === 'darwin') {
      app.setActivationPolicy('accessory');
    }
    this.#api = new ChromeAliveApi(this.coreServerAddress, this.onChromeAliveEvent.bind(this));

    ContextMenu({
      showInspectElement: true,
      showSearchWithGoogle: false,
      showLookUpSelection: false,
    });
    app.name = 'ChromeAlive!';

    app.setAppLogsPath();

    if (app.isReady()) {
      process.nextTick(() => this.appReady());
    } else {
      app.on('ready', () => this.appReady());
    }

    const vueDistPath = Path.resolve(__dirname, '..', 'ui');
    if (!Fs.existsSync(vueDistPath)) throw new Error('ChromeAlive UI not installed');

    const staticServer = new StaticServer(vueDistPath);

    this.#vueServer = Http.createServer((req, res) => {
      staticServer.serve(req, res);
    });

    this.#vueAddress = new Promise<AddressInfo>((resolve, reject) => {
      this.#vueServer.once('error', reject);
      this.#vueServer.listen({ port: 0 }, () => {
        this.#vueServer.off('error', reject);
        resolve(this.#vueServer.address() as AddressInfo);
      });
    });
  }

  private hideWindow(): void {
    if (!this.#isVisible) {
      return;
    }
    this.#browserWindow.hide();
    this.#isVisible = false;
  }

  private showWindow(): void {
    if (!this.#browserWindow.isVisible()) {
      this.#browserWindow.show();
    }

    if (!this.#browserWindow.isAlwaysOnTop()) {
      this.#browserWindow.setAlwaysOnTop(true, 'floating');
    }

    if (this.#browserWindow.isAlwaysOnTop()) {
      clearTimeout(this.#resetAlwaysTopTimeout);
      this.#resetAlwaysTopTimeout = setTimeout(() => this.#browserWindow.setAlwaysOnTop(false), 50);
    }
    this.#isVisible = true;
  }

  private appExit(): void {
    console.warn('EXITING CHROMEALIVE!');
    app.exit();
    this.#nsEventMonitor?.stop();
  }

  private async appReady(): Promise<void> {
    try {
      await this.#api.connect();
      await this.createWindow();
      if (!this.#hideOnLaunch) {
        await this.showWindow();
      }
      this.listenForMouseDown();
      ShutdownHandler.register(() => this.appExit());

      this.emit('ready');
    } catch (error) {
      console.error('ERROR in appReady: ', error);
    }
  }

  private listenForMouseDown() {
    // TODO: add linux/win support
    // https://github.com/wilix-team/iohook (seems unstable, but possibly look at ideas?)
    // windows: https://github.com/xanderfrangos/global-mouse-events

    if (process.platform !== 'darwin' || this.#nsEventMonitor) return;

    // eslint-disable-next-line import/no-unresolved,global-require
    const { NSEventMonitor, NSEventMask } = require('nseventmonitor') as any;

    // https://developer.apple.com/documentation/appkit/nsevent/eventtype/leftmousedown
    enum NSEventType {
      LeftMouseDown = 1,
      LeftMouseUp = 2,
    }

    const monitor = new NSEventMonitor();
    monitor.start(
      NSEventMask.mouseEntered | NSEventMask.leftMouseDown | NSEventMask.leftMouseUp,
      ev => {
        this.#mouseDown = ev.type === NSEventType.LeftMouseDown;
        return this.#api.send('Mouse.state', { isMousedown: this.#mouseDown });
      },
    );
    this.#nsEventMonitor = monitor;
  }

  private async createWindow(): Promise<void> {
    const mainScreen = screen.getPrimaryDisplay();
    const workarea = mainScreen.workArea;

    this.#browserWindow = new BrowserWindow({
      show: false,
      frame: false,
      roundedCorners: false,
      fullscreenable: false,
      transparent: true,
      movable: false,
      closable: true,
      acceptFirstMouse: true,
      paintWhenInitiallyHidden: true,
      hasShadow: false,
      skipTaskbar: true,
      autoHideMenuBar: true,
      width: workarea.width,
      y: workarea.y,
      x: workarea.x,
      webPreferences: {
        preload: `${__dirname}/PagePreload.js`,
        nativeWindowOpen: true,
        enableRemoteModule: true,
      },
      height: 50,
    });

    // for output window
    this.#browserWindow.webContents.setWindowOpenHandler(() => {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          vibrancy: 'popover',
          alwaysOnTop: false,
          hasShadow: true,
          useContentSize: true,
          webPreferences: {
            preload: `${__dirname}/PagePreload.js`,
          },
        },
      };
    });

    this.#browserWindow.webContents.on('did-create-window', childWindow => {
      childWindow.on('blur', e => {
        childWindow.hide();
        childWindow.close();
        e.preventDefault();
      });
    });

    this.#browserWindow.on('close', () => app.exit());
    this.#browserWindow.webContents.on('ipc-message', (e, message, ...args) => {
      if (message === 'mousemove') {
        if (this.#isVisible) {
          this.#browserWindow.show();
        }
      }
      if (message === 'resize-height') {
        this.#browserWindow.setBounds({
          height: args[0],
        });
      }
      if (message === 'chromealive:event') {
        const [eventType, data] = args;
        this.onChromeAliveEvent(eventType, data);
      }
    });

    const port = (await this.#vueAddress).port;
    await this.#browserWindow.loadURL(`http://localhost:${port}/app.html`);

    await this.#browserWindow.webContents.executeJavaScript(
      `(() => {
    const coreServerAddress = '${this.coreServerAddress ?? ''}';
    if (coreServerAddress) {
      window.heroServerUrl = coreServerAddress;
      if ('setHeroServerUrl' in window) window.setHeroServerUrl(coreServerAddress);
    }
})()`,
    );

    const workareaBounds = { left: workarea.x, top: workarea.y, ...workarea };
    await this.#api.send('App.ready', { workarea: workareaBounds });
  }

  private onChromeAliveEvent<T extends keyof IChromeAliveEvents>(
    eventType: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: IChromeAliveEvents[T],
  ): void {
    if (eventType === 'App.hide') this.hideWindow();
    if (eventType === 'App.show') this.showWindow();
    if (eventType === 'App.quit') app.exit();
  }
}
