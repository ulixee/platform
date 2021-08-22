import { app, BrowserWindow, screen } from 'electron';
import { EventEmitter } from 'events';
import { Server as StaticServer } from 'node-static';
import * as Http from 'http';
import { AddressInfo } from 'net';
import type { IAppBoundsChangedArgs } from '@ulixee/apps-chromealive-interfaces/apis/IAppBoundsChangedApi';
import * as Path from 'path';
import * as Fs from 'fs';
import * as ContextMenu from 'electron-context-menu';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';

export class ChromeAlive extends EventEmitter {
  #browserWindow?: BrowserWindow;
  #isVisible: boolean; // track visibility
  #vueServer: Http.Server;
  #vueAddress: Promise<AddressInfo>;
  #resetAlwaysTopTimeout: NodeJS.Timeout;

  constructor(readonly coreServerAddress?: string) {
    super();
    this.#isVisible = false;
    this.coreServerAddress ??= process.argv
      .find(x => x.startsWith('--coreServerAddress='))
      ?.replace('--coreServerAddress=', '');

    // hide the dock icon if it shows
    if (process.platform === 'darwin') {
      app.setActivationPolicy('accessory');
    }

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
    if (!this.#browserWindow || !this.#isVisible) {
      return;
    }
    this.#browserWindow.hide();
    this.#isVisible = false;
  }

  private async showWindow(): Promise<void> {
    if (!this.#browserWindow) await this.createWindow();

    if (!this.#browserWindow.isVisible()) {
      this.#browserWindow.show();
    }

    if (!this.#browserWindow.isAlwaysOnTop()) {
      this.#browserWindow.setAlwaysOnTop(true, 'floating');
    }

    if (this.#browserWindow.isAlwaysOnTop()) {
      clearTimeout(this.#resetAlwaysTopTimeout);
      this.#resetAlwaysTopTimeout = setTimeout(
        () => this.#browserWindow.setAlwaysOnTop(false),
        1e3,
      );
    }
    this.#isVisible = true;
  }

  private appExit(): void {
    console.warn('EXITING CHROMEALIVE!');
    app.exit();
  }

  private async appReady(): Promise<void> {
    try {
      await this.showWindow();
      ShutdownHandler.register(() => this.appExit());
      process.on('message', message => {
        if (message === 'exit') {
          this.appExit();
        }
      });
      this.emit('ready');
    } catch (error) {
      console.error('ERROR in appReady: ', error);
    }
  }

  private async createWindow(): Promise<void> {
    const mainScreen = screen.getPrimaryDisplay();
    const workarea = mainScreen.workArea;

    this.#browserWindow = new BrowserWindow({
      frame: false,
      roundedCorners: false,
      fullscreenable: false,
      transparent: true,
      movable: false,
      closable: true,
      hasShadow: false,
      skipTaskbar: true,
      autoHideMenuBar: true,
      width: workarea.width,
      y: workarea.y,
      x: workarea.x,
      webPreferences: {
        preload: `${__dirname}/preload.js`,
        nativeWindowOpen: true,
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
            preload: `${__dirname}/preload.js`,
          },
        },
      };
    });

    this.#browserWindow.on('close', () => app.exit());
    this.#browserWindow.webContents.on('ipc-message', (e, message, ...args) => {
      if (message === 'chromealive:event') {
        const [eventType] = args;
        if (eventType === 'App.hide') this.hideWindow();
        if (eventType === 'App.show') this.showWindow();
        if (eventType === 'App.quit') app.exit();
      }
      if (message === 'chromealive:api') {
        const [api, apiArgs] = args;

        if (api === 'App.boundsChanged') {
          const appBoundsArgs = apiArgs as IAppBoundsChangedArgs;
          this.#browserWindow.setBounds({
            height: appBoundsArgs.appBounds.height,
          });
        }
      }
    });

    const port = (await this.#vueAddress).port;
    await this.#browserWindow.loadURL(`http://localhost:${port}/app.html`);

    await this.#browserWindow.webContents.executeJavaScript(
      `window.workarea = ${JSON.stringify({ left: workarea.x, top: workarea.y, ...workarea })};`,
    );
    if (this.coreServerAddress) {
      await this.#browserWindow.webContents.executeJavaScript(
        `'setHeroServerUrl' in window ? window.setHeroServerUrl('${this.coreServerAddress}') : window.heroServerUrl = '${this.coreServerAddress}'`,
      );
    }
  }
}
