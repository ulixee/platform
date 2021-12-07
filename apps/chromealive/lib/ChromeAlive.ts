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
import IAppMoveEvent from '@ulixee/apps-chromealive-interfaces/events/IAppMoveEvent';

export class ChromeAlive extends EventEmitter {
  readonly #vueServer: Http.Server;
  #timelineWindow: BrowserWindow;
  #timelineIsVisible: boolean; // track visibility
  #timelineChildWindows = new Set<BrowserWindow>();

  #toolbarWindow: BrowserWindow;
  #toolbarIsVisible: boolean; // track visibility
  #toolbarChildWindows = new Set<BrowserWindow>();
  #resetToolbarAlwaysTopTimeout: NodeJS.Timeout;

  #vueAddress: Promise<AddressInfo>;
  #hideOnLaunch = false;
  #nsEventMonitor: any;
  #mouseDown: boolean;
  #api: ChromeAliveApi;
  #exited = false;

  constructor(readonly coreServerAddress?: string) {
    super();
    this.#timelineIsVisible = false;
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

  private hideTimelineWindow(): void {
    if (!this.#timelineIsVisible) {
      return;
    }

    this.#timelineWindow.hide();
    for (const window of this.#timelineChildWindows) {
      window.hide();
    }
    this.#timelineIsVisible = false;
  }

  private hideToolbarWindow(): void {
    if (!this.#toolbarIsVisible) {
      return;
    }

    this.#toolbarWindow.hide();
    for (const window of this.#toolbarChildWindows) {
      window.hide();
    }
    this.#toolbarIsVisible = false;
  }

  private showTimelineWindow(): void {
    if (!this.#timelineWindow.isVisible()) {
      this.#timelineWindow.show();
      for (const window of this.#timelineChildWindows) {
        window.show();
      }
    }
    this.toggleTimelineOnTop(true);
    this.#timelineIsVisible = true;
  }

  private showToolbarWindow(): void {
    if (!this.#toolbarWindow.isVisible()) {
      this.#toolbarWindow.show();
      for (const window of this.#toolbarChildWindows) {
        window.show();
      }
    }
    this.toggleToolbarOnTop(true);
    this.#toolbarIsVisible = true;
  }

  private toggleTimelineOnTop(onTop: boolean) {
    this.#timelineWindow.setAlwaysOnTop(onTop);
    for (const window of this.#timelineChildWindows) {
      window.setAlwaysOnTop(onTop);
    }
  }

  private toggleToolbarOnTop(onTop: boolean) {
    if (this.#toolbarWindow.isAlwaysOnTop() !== onTop) {
      this.#toolbarWindow.setAlwaysOnTop(onTop, 'floating');
    }

    if (this.#toolbarWindow.isAlwaysOnTop()) {
      clearTimeout(this.#resetToolbarAlwaysTopTimeout);
      this.#resetToolbarAlwaysTopTimeout = setTimeout(() => this.#toolbarWindow.setAlwaysOnTop(false), 50);
    }
    for (const window of this.#toolbarChildWindows) {
      window.setAlwaysOnTop(onTop);
    }
  }

  private appExit(): void {
    if (this.#exited) return;
    this.#exited = true;

    console.warn('EXITING CHROMEALIVE!');
    app.exit();
    this.#nsEventMonitor?.stop();
  }

  private async appReady(): Promise<void> {
    try {
      await this.#api.connect();
      await Promise.all([
        this.createTimelineWindow(),
        this.createToolbarWindow(),
      ]);
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

  private async createTimelineWindow(): Promise<void> {
    const mainScreen = screen.getPrimaryDisplay();
    const workarea = mainScreen.workArea;

    this.#timelineWindow = new BrowserWindow({
      show: false,
      frame: false,
      roundedCorners: false,
      movable: false,
      closable: true,
      transparent: true,
      acceptFirstMouse: true,
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
    this.#timelineWindow.webContents.setWindowOpenHandler(details => {
      const isPopup = details.url.includes('popup');
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          frame: !isPopup,
          roundedCorners: true,
          movable: !isPopup,
          transparent: isPopup,
          titleBarStyle: 'default',
          alwaysOnTop: true,
          hasShadow: true,
          useContentSize: true,
          webPreferences: {
            preload: `${__dirname}/PagePreload.js`,
          },
        },
      };
    });

    this.#timelineWindow.webContents.on('did-create-window', childWindow => {
      this.#timelineChildWindows.add(childWindow);
      let hasHandled = false;
      childWindow.on('close', async e => {
        if (!hasHandled) {
          hasHandled = true;
          e.preventDefault();
          await childWindow.webContents.executeJavaScript(
            'window.dispatchEvent(new CustomEvent("manual-close"))',
          );
          childWindow.close();
          return;
        }
        this.#timelineChildWindows.delete(childWindow);
      });
    });

    this.#timelineWindow.on('close', () => app.exit());
    this.#timelineWindow.webContents.on('ipc-message', (e, message, ...args) => {
      if (message === 'mousemove') {
        if (this.#timelineIsVisible) {
          this.#timelineWindow.setAlwaysOnTop(true);
        }
      }
      if (message === 'resize-height') {
        this.#timelineWindow.setBounds({
          height: args[0],
        });
      }
      if (message === 'chromealive:event') {
        const [eventType, data] = args;
        this.onChromeAliveEvent(eventType, data);
      }
    });

    const port = (await this.#vueAddress).port;
    await this.#timelineWindow.loadURL(`http://localhost:${port}/app.html`);

    await this.#timelineWindow.webContents.executeJavaScript(
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

  private async createToolbarWindow(): Promise<void> {
    this.#toolbarWindow = new BrowserWindow({
      show: false,
      frame: false,
      roundedCorners: false,
      movable: false,
      closable: true,
      transparent: true,
      acceptFirstMouse: true,
      hasShadow: false,
      skipTaskbar: true,
      autoHideMenuBar: true,
      width: 165,
      height: 290,
      y: 200,
      x: 0,
      webPreferences: {
        preload: `${__dirname}/PagePreload.js`,
        nativeWindowOpen: true,
        enableRemoteModule: true,
      },
    });

    // for output window
    this.#toolbarWindow.webContents.setWindowOpenHandler(details => {
      const isPopup = details.url.includes('popup');
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          frame: !isPopup,
          roundedCorners: true,
          movable: !isPopup,
          transparent: isPopup,
          titleBarStyle: 'default',
          alwaysOnTop: true,
          hasShadow: true,
          useContentSize: true,
          webPreferences: {
            preload: `${__dirname}/PagePreload.js`,
          },
        },
      };
    });

    this.#toolbarWindow.webContents.on('did-create-window', childWindow => {
      this.#toolbarChildWindows.add(childWindow);
      let hasHandled = false;
      childWindow.on('close', async e => {
        if (!hasHandled) {
          hasHandled = true;
          e.preventDefault();
          await childWindow.webContents.executeJavaScript(
            'window.dispatchEvent(new CustomEvent("manual-close"))',
          );
          childWindow.close();
          return;
        }
        this.#toolbarChildWindows.delete(childWindow);
      });
    });

    this.#toolbarWindow.on('close', () => app.exit());
    this.#toolbarWindow.webContents.on('ipc-message', (e, message, ...args) => {
      if (message === 'mousemove') {
        if (this.#toolbarIsVisible) {
          this.#toolbarWindow.show();
        }
      }
      if (message === 'chromealive:event') {
        const [eventType, data] = args;
        this.onChromeAliveEvent(eventType, data);
      }
    });

    const port = (await this.#vueAddress).port;
    await this.#toolbarWindow.loadURL(`http://localhost:${port}/toolbar.html`);

    await this.#toolbarWindow.webContents.executeJavaScript(
      `(() => {
    const coreServerAddress = '${this.coreServerAddress ?? ''}';
    if (coreServerAddress) {
      window.heroServerUrl = coreServerAddress;
      if ('setHeroServerUrl' in window) window.setHeroServerUrl(coreServerAddress);
    }
})()`,
    );
  }

  private moveTimelineWindow(move: IAppMoveEvent): void {
    const bounds = this.#timelineWindow.getBounds();
    if (bounds.x !== move.bounds.x || bounds.y !== move.bounds.y) {
      this.#timelineWindow.setPosition(move.bounds.x, move.bounds.y);
    }
    if (bounds.width !== move.bounds.width) {
      bounds.width = move.bounds.width
      this.#timelineWindow.setBounds(bounds)
    }
  }

  private onChromeAliveEvent<T extends keyof IChromeAliveEvents>(
    eventType: T,
    data: IChromeAliveEvents[T],
  ): void {
    if (eventType === 'App.startedDraggingChrome') {
      this.hideTimelineWindow();
      this.toggleToolbarOnTop(true);
    }
    if (eventType === 'App.stoppedDraggingChrome') {
      this.showTimelineWindow();
      this.toggleToolbarOnTop(true);
    }
    if (eventType === 'App.show' && !this.#timelineIsVisible) {
      this.showTimelineWindow();
    }
    if (eventType === 'App.show') {
      this.showToolbarWindow();
    }
    if (eventType === 'App.hide') {
      this.hideTimelineWindow();
      this.hideToolbarWindow();
    }
    if (eventType === 'App.onTop') {
      this.toggleTimelineOnTop(data as boolean);
      this.toggleToolbarOnTop(data as boolean);
    }
    if (eventType === 'App.quit') app.exit();
    if (eventType === 'App.move') this.moveTimelineWindow(data as IAppMoveEvent);
  }
}
