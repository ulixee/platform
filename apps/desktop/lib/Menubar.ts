import ChromeAliveCore from '@ulixee/apps-chromealive-core';
import { app, BrowserWindow, shell, systemPreferences, Tray } from 'electron';
import log from 'electron-log';
import { EventEmitter } from 'events';
import UlixeeServer from '@ulixee/server';
import * as Positioner from 'electron-positioner';
import * as Path from 'path';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import IMenubarOptions from '../interfaces/IMenubarOptions';
import { getWindowPosition } from './util/getWindowPosition';
import VueServer from './VueServer';
import installDefaultChrome from './util/installDefaultChrome';
import UlixeeConfig from '@ulixee/commons/config';
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
const { version } = require('../package.json');
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
  #ulixeeConfig: UlixeeConfig;
  #isClosing = false;

  constructor(options?: IMenubarOptions) {
    super();
    this.#options = options;
    this.#isVisible = false;
    // hide the dock icon if it shows
    if (process.platform === 'darwin') {
      app.setActivationPolicy('accessory');
    }
    const cacheTime = app.isPackaged ? 3600 * 24 : 0;
    this.#vueServer = new VueServer(vueDistPath, cacheTime);
    this.#ulixeeConfig = UlixeeConfig.global;

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

    this.#isVisible = false;
    try {
      if (this.#browserWindow?.isVisible() && !this.#browserWindow?.isDestroyed()) {
        this.#browserWindow?.hide();
      }
    } catch (error) {
      if (!String(error).includes('Object has been destroyed')) throw error;
    }
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

  private async appExit(): Promise<void> {
    if (this.#isClosing) return;
    this.#isClosing = true;
    console.warn('Quitting Ulixee Menubar');
    this.#tray.removeAllListeners();
    this.hideWindow();
    await this.stopServer();
    app.exit();
  }

  private appReady(): void {
    try {
      // for now auto-start
      this.startServer().catch(console.error);
      ShutdownHandler.exitOnSignal = false;
      ShutdownHandler.register(() => this.appExit());

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

      log.transports.file.level = 'debug';
      autoUpdater.logger = log;
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = false;
      autoUpdater.allowDowngrade = true;
      autoUpdater.allowPrerelease = version.includes('alpha');
      autoUpdater.on('update-not-available', this.noUpdateAvailable.bind(this));
      autoUpdater.on('update-available', this.onUpdateAvailable.bind(this));
      autoUpdater.signals.progress(this.onDownloadProgress.bind(this));

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

  private listenForMouseDown(): void {
    if (process.platform === 'darwin') {
      // eslint-disable-next-line import/no-unresolved,global-require
      const { NSEventMonitor, NSEventMask } = require('nseventmonitor') as any;

      this.#nsEventMonitor ??= new NSEventMonitor();
      (this.#nsEventMonitor as any).start(
        NSEventMask.leftMouseDown | NSEventMask.rightMouseDown,
        this.hideWindow.bind(this),
      );
    } else if (process.platform === 'win32') {
      // eslint-disable-next-line import/no-unresolved,global-require
      const mouseEvents = require('global-mouse-events') as any;
      mouseEvents.on('mousedown', event => {
        if (event.button === 1 || event.button === 2) this.hideWindow();
      });
    }
  }

  private async noUpdateAvailable(): Promise<void> {
    log.verbose('No new Ulixee.app versions available');
    await this.sendToVueApp('Version.onLatest', {});
  }

  private async onUpdateAvailable(update: UpdateInfo): Promise<void> {
    log.info('New Ulixee.app version available', update);
    await this.sendToVueApp('Version.available', {
      version: update.version,
    });
  }

  private async onDownloadProgress(progress: ProgressInfo): Promise<void> {
    log.verbose('New version download progress', progress);
    await this.sendToVueApp('Version.download', {
      downloadPercent: progress.percent,
    });
  }

  private async versionCheck(): Promise<void> {
    try {
      await autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
      log.error('ERROR checking for new version', error);
    }
  }

  private async versionDownload(): Promise<void> {
    await autoUpdater.downloadUpdate();
    await autoUpdater.quitAndInstall(false, true);
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
      if (!this.#browserWindow || this.#isClosing) {
        return;
      }
      this.#blurTimeout = setTimeout(() => this.hideWindow(), 100);
    });

    this.#browserWindow.setVisibleOnAllWorkspaces(true);
    this.#browserWindow.on('close', this.windowClear.bind(this));
    this.#browserWindow.webContents.on('ipc-message', async (e, message, ...args) => {
      if (message === 'desktop:api') {
        const [api] = args;

        if (api === 'mousedown' && this.#browserWindow && this.#isVisible) {
          this.hideWindow();
        }

        if (api === 'App.quit') {
          await this.appExit();
        }

        if (api === 'App.openLogsDirectory') {
          await shell.openPath(Path.dirname(log.transports.file.getFile().path));
        }

        if (api === 'App.openDataDirectory') {
          await shell.openPath(this.#ulixeeServer.dataDir);
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

        if (api === 'Version.check') {
          await this.versionCheck();
        }

        if (api === 'Version.download') {
          await this.versionDownload();
        }
      }
    });

    const port = await this.#vueServer.port;
    const windowBackground = systemPreferences.getColor('window-background').replace('#', '');
    const url = `http://localhost:${port}/?windowBackground=${windowBackground}`;
    await this.#browserWindow.loadURL(url);
    if (!app.isPackaged) {
      this.#browserWindow.webContents.openDevTools({ mode: 'undocked' });
    }
    if (this.#ulixeeServer) {
      await this.updateServerStatus();
    }
  }

  private windowClear(): void {
    this.#browserWindow = undefined;
  }

  /// //// SERVER MANAGEMENT ////////////////////////////////////////////////////////////////////////////////////////////

  private async stopServer(): Promise<void> {
    if (!this.#ulixeeServer) return;

    // eslint-disable-next-line no-console
    console.log(`CLOSING ULIXEE SERVER`);
    const server = this.#ulixeeServer;
    this.#ulixeeServer = null;
    await server.close();
    await this.updateServerStatus();
  }

  private async startServer(): Promise<void> {
    if (this.#ulixeeServer) return;
    ChromeAliveCore.register(true);
    this.#ulixeeServer = new UlixeeServer();
    const address = UlixeeConfig.global?.serverHost;
    let port = 0;
    if (address) {
      port = Number(address.split(':').pop());
    }
    await this.#ulixeeServer.listen({ port });

    await installDefaultChrome();

    // eslint-disable-next-line no-console
    console.log(`STARTED ULIXEE SERVER at ${await this.#ulixeeServer.address}`);
    await this.updateServerStatus();
  }

  private async updateServerStatus(): Promise<void> {
    if (this.#isClosing) return;
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
      document.dispatchEvent(new CustomEvent('desktop:event', evt));
    })()`);
    }
  }
}
