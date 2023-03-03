import { app, BrowserWindow, shell, systemPreferences, Tray } from 'electron';
import log from 'electron-log';
import { EventEmitter } from 'events';
import { CloudNode } from '@ulixee/cloud';
import * as Positioner from 'electron-positioner';
import * as Path from 'path';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import { autoUpdater, ProgressInfo, UpdateInfo } from 'electron-updater';
import IMenubarOptions from '../interfaces/IMenubarOptions';
import { getWindowPosition } from './util/getWindowPosition';
import installDefaultChrome from './util/installDefaultChrome';
import StaticServer from './StaticServer';
import { WindowManager } from './WindowManager';
import ApiManager from './ApiManager';

const { version } = require('../package.json');
// Forked from https://github.com/maxogden/menubar

const iconPath = Path.resolve(__dirname, '..', 'assets', 'IconTemplate.png');

export class Menubar extends EventEmitter {
  cloudNode: CloudNode;
  readonly staticServer: StaticServer;

  #tray?: Tray;
  #browserWindow?: BrowserWindow;
  #blurTimeout: NodeJS.Timeout | null = null; // track blur events with timeout
  #isVisible: boolean; // track visibility
  #cachedBounds?: Electron.Rectangle; // _cachedBounds are needed for double-clicked event
  #options: IMenubarOptions;
  #nsEventMonitor: unknown;
  #positioner: Positioner | undefined;
  #windowManager: WindowManager;
  #isClosing = false;
  #updateInfoPromise: Promise<UpdateInfo>;
  #installUpdateOnExit = false;
  #downloadProgress = 0;
  #apiManager: ApiManager;

  constructor(options?: IMenubarOptions) {
    super();
    this.#options = options;
    this.#isVisible = false;
    // hide the dock icon if it shows
    if (process.platform === 'darwin') {
      app.setActivationPolicy('accessory');
    }
    app.setAppLogsPath();
    (process.env as any).ELECTRON_DISABLE_SECURITY_WARNINGS = true;
    ShutdownHandler.register(() => this.appExit());

    this.staticServer = new StaticServer(Path.resolve(__dirname, '..', 'ui'));
    void this.appReady();
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

  private async beforeQuit(): Promise<void> {
    if (this.#isClosing) return;
    this.#isClosing = true;
    console.warn('Quitting Ulixee Menubar');
    this.#tray?.removeAllListeners();
    this.hideWindow();
    this.#apiManager?.close();
    await this.stopCloud();
    await this.#windowManager.close();
  }

  private async appExit(): Promise<void> {
    await this.beforeQuit();
    if (this.#installUpdateOnExit) {
      log.debug('Installing update before exit');
      await this.#updateInfoPromise;
      await autoUpdater.quitAndInstall(false, true);
    }
    app.exit();
  }

  private async appReady(): Promise<void> {
    try {
      await app.whenReady();
      // for now auto-start
      await this.staticServer.load();
      // eslint-disable-next-line no-console
      console.log('Static server running at ', this.staticServer.getPath(''))
      await this.startCloud();
      this.#apiManager = new ApiManager();
      this.#windowManager = new WindowManager(this, this.#apiManager);
      await this.#apiManager.start(await this.cloudNode?.address);

      await this.createWindow();

      this.#tray = new Tray(iconPath);

      app.on('activate', (_event, hasVisibleWindows) => {
        if (!hasVisibleWindows) {
          this.showWindow().catch(console.error);
        }
      });

      app.once('before-quit', this.beforeQuit.bind(this));

      this.#tray.on('click', this.clicked.bind(this));
      this.#tray.on('right-click', this.clicked.bind(this));
      this.#tray.on('double-click', this.doubleClicked.bind(this));
      this.#tray.setToolTip(this.#options.tooltip || '');

      autoUpdater.logger = null;
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

      this.emit('ready');
      app.dock?.hide();
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
    await this.sendToFrontend('Version.onLatest', {});
  }

  private async onUpdateAvailable(update: UpdateInfo): Promise<void> {
    log.info('New Ulixee.app version available', update);
    this.#updateInfoPromise = Promise.resolve(update);
    await this.sendToFrontend('Version.available', {
      version: update.version,
    });
  }

  private async onDownloadProgress(progress: ProgressInfo): Promise<void> {
    log.verbose('New version download progress', progress);
    this.#downloadProgress = Math.round(progress.percent);
    await this.sendToFrontend('Version.download', {
      progress: this.#downloadProgress,
    });
  }

  private async versionCheck(): Promise<void> {
    if (await this.#updateInfoPromise) return;
    if (autoUpdater.isUpdaterActive()) return;
    try {
      log.verbose('Checking for version update');
      this.#updateInfoPromise = autoUpdater.checkForUpdates().then(x => x.updateInfo);
      await this.#updateInfoPromise;
    } catch (error) {
      log.error('ERROR checking for new version', error);
    }
  }

  private async versionInstall(): Promise<void> {
    log.verbose('Installing version', {
      progress: this.#downloadProgress,
      update: await this.#updateInfoPromise,
    });
    this.#installUpdateOnExit = true;
    await this.sendToFrontend('Version.installing', {});
    if (this.#downloadProgress < 100) await autoUpdater.downloadUpdate();
    await autoUpdater.quitAndInstall(false, true);
  }

  private async doubleClicked(): Promise<void> {
    // if blur was invoked clear timeout
    if (this.#blurTimeout) {
      clearInterval(this.#blurTimeout);
    }

    if (this.#browserWindow && this.#isVisible) {
      this.hideWindow();
    }

    await this.#windowManager.openDesktop();
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

    try {
      if (!this.#updateInfoPromise) {
        this.#updateInfoPromise = autoUpdater
          .checkForUpdatesAndNotify()
          .then(x => x?.updateInfo ?? null);
        await this.#updateInfoPromise;
      }
    } catch (error) {
      log.error('ERROR checking for new version', error);
    }
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
      useContentSize: true,
      webPreferences: {
        javascript: true,
        preload: `${__dirname}/MenubarPagePreload.js`,
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
          await shell.openPath(this.cloudNode.dataDir);
        }

        if (api === 'App.openHeroSession') {
          await this.#windowManager.pickHeroSession();
        }

        if (api === 'App.openDesktop') {
          await this.#windowManager.openDesktop();
        }

        if (api === 'Cloud.stop' || api === 'Cloud.restart') {
          await this.stopCloud();
        }

        if (api === 'Cloud.start' || api === 'Cloud.restart') {
          await this.startCloud();
        }

        if (api === 'Cloud.getStatus') {
          await this.updateLocalCloudStatus();
        }

        if (api === 'Version.check') {
          await this.versionCheck();
        }

        if (api === 'Version.install') {
          await this.versionInstall();
        }
      }
    });

    const backgroundPref = process.platform === 'win32' ? 'window' : 'window-background';
    const windowBackground = systemPreferences.getColor(backgroundPref)?.replace('#', '') ?? '';
    const url = this.staticServer.getPath(`menubar.html?windowBackground=${windowBackground}`);
    await this.#browserWindow.loadURL(url);
    if (process.env.OPEN_DEVTOOLS) {
      this.#browserWindow.webContents.openDevTools({ mode: 'detach' });
    }
    if (this.cloudNode) {
      await this.updateLocalCloudStatus();
    }
  }

  private windowClear(): void {
    this.#browserWindow = undefined;
  }

  /// //// CLOUD MANAGEMENT ////////////////////////////////////////////////////////////////////////////////////////////

  private async stopCloud(): Promise<void> {
    if (!this.cloudNode) return;

    // eslint-disable-next-line no-console
    console.log(`CLOSING ULIXEE CLOUD`);
    const cloudNode = this.cloudNode;
    this.cloudNode = null;
    await cloudNode.close();
    await this.updateLocalCloudStatus();
  }

  private async startCloud(): Promise<void> {
    if (this.cloudNode) return;
    this.cloudNode = new CloudNode();
    await this.cloudNode.listen();

    await installDefaultChrome();

    // eslint-disable-next-line no-console
    console.log(`STARTED ULIXEE CLOUD at ${await this.cloudNode.address}`);
    await this.updateLocalCloudStatus();
  }

  private async updateLocalCloudStatus(): Promise<void> {
    if (this.#isClosing) return;
    let address: string = null;
    if (this.cloudNode) {
      address = await this.cloudNode.address;
    }
    await this.sendToFrontend('Cloud.status', {
      started: !!this.cloudNode,
      address,
    });
  }

  private async sendToFrontend(eventType: string, data: any): Promise<void> {
    if (this.#browserWindow) {
      const json = { detail: { eventType, data } };
      await this.#browserWindow.webContents.executeJavaScript(`(()=>{
      const evt = ${JSON.stringify(json)};
      document.dispatchEvent(new CustomEvent('desktop:event', evt));
    })()`);
    }
  }
}
