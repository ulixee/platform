import ChromeAliveCore from '@ulixee/apps-chromealive-core';
import { app, BrowserWindow, shell, systemPreferences, Tray } from 'electron';
import log from 'electron-log';
import { EventEmitter } from 'events';
import UlixeeServer from '@ulixee/server';
import * as Positioner from 'electron-positioner';
import * as Path from 'path';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import * as Fs from 'fs';
import * as Tar from 'tar';
import { getCacheDirectory } from '@ulixee/commons/lib/dirUtils';
import IMenubarOptions from '../interfaces/IMenubarOptions';
import { getWindowPosition } from './util/getWindowPosition';
import VueServer from './VueServer';

// Forked from https://github.com/maxogden/menubar

const iconPath = Path.resolve(__dirname, '..', 'assets', 'IconTemplate.png');
const vueDistPath = Path.resolve(__dirname, '..', 'ui');

export class Menubar extends EventEmitter {
  #tray?: Tray;
  #browserWindow?: BrowserWindow;
  #blurTimeout: NodeJS.Timeout | null = null; // track blur events with timeout
  #isVisible: boolean; // track visibility
  #cachedBounds?: Electron.Rectangle; // _cachedBounds are needed for double-clicked event
  #options: IMenubarOptions;
  #nsEventMonitor: unknown;
  #positioner: Positioner | undefined;
  #vueServer: VueServer;
  #ulixeeServer: UlixeeServer;
  #hasUnpackedChrome = false;

  constructor(options?: IMenubarOptions) {
    super();
    this.#options = options;
    this.#isVisible = false;
    // hide the dock icon if it shows
    if (process.platform === 'darwin') {
      app.setActivationPolicy('accessory');
    }
    this.#vueServer = new VueServer(vueDistPath);

    if (app.isReady()) {
      // See https://github.com/maxogden/menubar/pull/151
      process.nextTick(() => this.appReady());
    } else {
      app.on('ready', () => this.appReady());
    }
  }

  get tray(): Tray {
    if (!this.#tray)
      throw new Error('Please access `this.tray` after the `ready` event has fired.');
    return this.#tray;
  }

  private hideWindow(): void {
    if (this.#blurTimeout) {
      clearTimeout(this.#blurTimeout);
      this.#blurTimeout = null;
    }
    (this.#nsEventMonitor as any)?.stop();

    if (this.#browserWindow?.isVisible()) {
      this.#browserWindow.hide();
    }
    this.#isVisible = false;
  }

  private async showWindow(trayPos?: Electron.Rectangle): Promise<void> {
    if (!this.#tray) {
      throw new Error('Tray should have been instantiated by now');
    }

    if (!this.#browserWindow) {
      await this.createWindow();
    }

    // Use guard for TypeScript, to avoid ! everywhere
    if (!this.#browserWindow) {
      throw new Error('Window has been initialized just above. qed.');
    }

    // 'Windows' taskbar: sync windows position each time before showing
    // https://github.com/maxogden/menubar/issues/232
    if (['win32', 'linux'].includes(process.platform)) {
      // Fill in this.#options.windowPosition when taskbar position is available
      this.#options.windowPosition = getWindowPosition(this.#tray);
    }

    if (trayPos && trayPos.x !== 0) {
      // Cache the bounds
      this.#cachedBounds = trayPos;
    } else if (this.#cachedBounds) {
      // Cached value will be used if showWindow is called without bounds data
      trayPos = this.#cachedBounds;
    } else if (this.#tray.getBounds) {
      // Get the current tray bounds
      trayPos = this.#tray.getBounds();
    }

    // Default the window to the right if `trayPos` bounds are undefined or null.
    let noBoundsPosition;
    if (
      (trayPos === undefined || trayPos.x === 0) &&
      this.#options.windowPosition &&
      this.#options.windowPosition.startsWith('tray')
    ) {
      noBoundsPosition = process.platform === 'win32' ? 'bottomRight' : 'topRight';
    }

    const position = this.#positioner.calculate(
      this.#options.windowPosition || noBoundsPosition,
      trayPos,
    ) as { x: number; y: number };

    const x = position.x;
    const y = position.y;

    // `.setPosition` crashed on non-integers
    // https://github.com/maxogden/menubar/issues/233
    this.#browserWindow.setPosition(Math.round(x), Math.round(y));
    this.#browserWindow.show();
    this.listenForMouseDown();

    this.#isVisible = true;
  }

  private appReady(): void {
    try {
      app.on('before-quit', async e => {
        console.warn('Quitting Ulixee Menubar');
        e.preventDefault();
        await this.stopServer();
        this.hideWindow();
        app.exit();
      });
      ChromeAliveCore.register(true);
      // for now auto-start
      this.startServer().catch(console.error);
      ShutdownHandler.exitOnSignal = false;
      ShutdownHandler.register(() => this.stopServer());

      this.#tray = new Tray(iconPath);

      app.on('activate', (_event, hasVisibleWindows) => {
        app.dock?.hide();
        if (!hasVisibleWindows) {
          this.showWindow().catch(console.error);
        }
      });

      this.#tray.on('click', this.clicked.bind(this));
      this.#tray.on('right-click', this.clicked.bind(this));
      this.#tray.on('double-click', this.clicked.bind(this));
      this.#tray.setToolTip(this.#options.tooltip || '');

      if (!this.#options.windowPosition) {
        // Fill in this.#options.windowPosition when taskbar position is available
        this.#options.windowPosition = getWindowPosition(this.#tray);
      }

      this.createWindow()
        .then(() => {
          this.emit('ready');
          return app.dock?.hide();
        })
        .catch(err => console.error('ERROR creating app window', err));
    } catch (error) {
      console.error('ERROR in appReady: ', error);
    }
  }

  private listenForMouseDown() {
    if (process.platform !== 'darwin') return;
    // eslint-disable-next-line import/no-unresolved,global-require
    const { NSEventMonitor, NSEventMask } = require('nseventmonitor') as any;

    this.#nsEventMonitor ??= new NSEventMonitor();
    (this.#nsEventMonitor as any).start(
      NSEventMask.leftMouseDown | NSEventMask.rightMouseDown,
      this.hideWindow.bind(this),
    );
  }

  private async clicked(
    event?: Electron.KeyboardEvent,
    bounds?: Electron.Rectangle,
  ): Promise<void> {
    if (event && (event.shiftKey || event.ctrlKey || event.metaKey)) {
      return this.hideWindow();
    }

    // if blur was invoked clear timeout
    if (this.#blurTimeout) {
      clearInterval(this.#blurTimeout);
    }

    if (this.#browserWindow && this.#isVisible) {
      return this.hideWindow();
    }

    this.#cachedBounds = bounds || this.#cachedBounds;
    await this.showWindow(this.#cachedBounds);
  }

  private async createWindow(): Promise<void> {
    const defaults = {
      show: false, // Don't show it at first
      frame: false, // Remove window frame
      width: this.#options.width,
      height: this.#options.height,
    };

    this.#browserWindow = new BrowserWindow({
      ...defaults,
      roundedCorners: false,
      skipTaskbar: true,
      autoHideMenuBar: true,
      transparent: true,
      alwaysOnTop: true,
      webPreferences: {
        preload: `${__dirname}/PagePreload.js`,
      },
    });

    this.#positioner = new Positioner(this.#browserWindow);

    this.#browserWindow.on('blur', () => {
      if (!this.#browserWindow) {
        return;
      }
      this.#blurTimeout = setTimeout(() => this.hideWindow(), 100);
    });

    this.#browserWindow.setVisibleOnAllWorkspaces(true);
    this.#browserWindow.on('close', this.windowClear.bind(this));
    this.#browserWindow.webContents.on('ipc-message', async (e, message, ...args) => {
      if (message === 'boss:api') {
        const [api] = args;

        if (api === 'App.quit') {
          app.quit();
        }

        if (api === 'App.logs') {
          shell.openPath(Path.dirname(log.transports.file.getFile().path));
        }

        if (api === 'Server.stop' || api === 'Server.restart') {
          await this.stopServer();
        }

        if (api === 'Server.start' || api === 'Server.restart') {
          await this.startServer();
        }

        if (api === 'Server.getStatus') {
          await this.updateServerStatus();
        }
      }
    });

    const port = await this.#vueServer.port;
    const windowBackground = systemPreferences.getColor('window-background').replace('#', '');
    const url = `http://localhost:${port}/?windowBackground=${windowBackground}`;
    await this.#browserWindow.loadURL(url);
    if (this.#ulixeeServer) {
      await this.updateServerStatus();
    }
  }

  private windowClear(): void {
    this.#browserWindow = undefined;
  }

  /////// SERVER MANAGEMENT ////////////////////////////////////////////////////////////////////////////////////////////

  private async stopServer() {
    if (!this.#ulixeeServer) return;

    // eslint-disable-next-line no-console
    console.log(`CLOSING ULIXEE SERVER`);
    const server = this.#ulixeeServer;
    this.#ulixeeServer = null;
    await server.close();
    await this.updateServerStatus();
  }

  private async startServer() {
    if (this.#ulixeeServer) return;
    this.#ulixeeServer = new UlixeeServer();

    await this.tryUnpackEmbeddedChrome();

    // TODO: read port from common ulixee.json? Or put running port into a file?
    await this.#ulixeeServer.listen({ port: 1337 });

    // eslint-disable-next-line no-console
    console.log(`STARTED ULIXEE SERVER at ${await this.#ulixeeServer.address}`);
    await this.updateServerStatus();
  }

  private async updateServerStatus() {
    let address: string = null;
    if (this.#ulixeeServer) {
      address = await this.#ulixeeServer.address;
    }
    await this.sendToVueApp('Server.status', {
      started: !!this.#ulixeeServer,
      address,
    });
  }

  private async sendToVueApp(eventType: string, data: any): Promise<void> {
    if (this.#browserWindow) {
      const json = { detail: { eventType, data } };
      await this.#browserWindow.webContents.executeJavaScript(`(()=>{
      const evt = ${JSON.stringify(json)};
      document.dispatchEvent(new CustomEvent('boss:event', evt));
    })()`);
    }
  }

  private async tryUnpackEmbeddedChrome(): Promise<void> {
    if (this.#hasUnpackedChrome) return;
    this.#hasUnpackedChrome = true;

    let packagedChromesDir = `${__dirname}/../chromes`;

    // if first run, need to see if we can unpack chromes
    const chromeDir =
      process.env.BROWSERS_DIR ?? Path.join(getCacheDirectory(), 'ulixee', 'chrome');

    if (!Fs.existsSync(chromeDir)) Fs.mkdirSync(chromeDir, { recursive: true });

    if (Fs.readdirSync(chromeDir).filter(x => !x.startsWith('.')).length) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(
      'No $cachedir/ulixee/chrome directory exists, seeing if we can unpack from Boss package',
    );

    if (app.isPackaged) {
      // app path is Boss.app/Content/Resources/app.asar on mac, boss/resources/app.asar on linux/win
      let contentDir = Path.normalize(Path.join(app.getAppPath(), '..'));
      if (Path.basename(contentDir).toLowerCase() === 'resources') {
        contentDir = Path.normalize(Path.join(contentDir, '..'));
      }

      packagedChromesDir = `${contentDir}/chromes`;
    }

    if (!Fs.existsSync(packagedChromesDir)) {
      // eslint-disable-next-line no-console
      console.log('No packaged chromes directory exists at:', packagedChromesDir);
      return;
    }

    for (const file of Fs.readdirSync(packagedChromesDir)) {
      if (file.endsWith('.tar.gz')) {
        // eslint-disable-next-line no-console
        console.log('Got a Chrome package to unpack', file);
        // @ts-ignore
        await Tar.extract({
          file: `${packagedChromesDir}/${file}`,
          cwd: chromeDir,
          sync: true,
          strict: true,
          preservePaths: true,
        });
      }
    }
  }
}
