import { app, BrowserWindow, screen, shell } from 'electron';
import * as remoteMain from '@electron/remote/main';
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
  #toolbarWindow: BrowserWindow;
  #toolbarIsVisible: boolean; // track visibility
  #childWindowsByName = new Map<string, BrowserWindow>();

  #vueAddress: Promise<AddressInfo>;
  #hideOnLaunch = false;
  #nsEventMonitor: any;
  #mouseDown: boolean;
  #api: ChromeAliveApi;
  #exited = false;
  #preDragVisibleChildWindowIds: number[] = [];

  constructor(readonly coreServerAddress?: string) {
    super();
    this.#toolbarIsVisible = false;
    this.coreServerAddress ??= process.argv
      .find(x => x.startsWith('--coreServerAddress='))
      ?.replace('--coreServerAddress=', '');

    this.#hideOnLaunch = process.argv.some(x => x === '--hide');

    // hide the dock icon if it shows
    if (process.platform === 'darwin') {
      app.setActivationPolicy('accessory');
    }
    this.#api = new ChromeAliveApi(this.coreServerAddress, this.onChromeAliveEvent.bind(this));
    this.#api.once('close', () => this.appExit());

    ContextMenu({
      showInspectElement: true,
      showSearchWithGoogle: false,
      showLookUpSelection: false,
      showCopyImage: false,
      showCopyImageAddress: false,
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

    const cacheTime = app.isPackaged ? 3600 * 24 : 0;
    const staticServer = new StaticServer(vueDistPath, { cache: cacheTime });

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

  private hideToolbarWindow(): void {
    console.log('hideToolbar');
    if (!this.#toolbarIsVisible) {
      return;
    }

    this.#toolbarWindow.hide();
    for (const window of this.#childWindowsByName.values()) {
      window.hide();
    }
    this.#toolbarIsVisible = false;
  }

  private showToolbarWindow(onTop: boolean): void {
    console.log('showToolbar', { onTop });

    if (!this.#toolbarWindow.isVisible()) {
      this.#toolbarWindow.show();
      for (const window of this.#childWindowsByName.values()) {
        window.show();
      }
    }
    this.toggleToolbarOnTop(onTop);
    this.#toolbarIsVisible = true;
    if (!onTop) {
     const hasFocus = this.doesAppWindowHaveFocus();
      console.log('not on top', hasFocus);
      if (!hasFocus) this.#toolbarWindow.blur();
    }
  }

  private doesAppWindowHaveFocus(): boolean {
    if (this.#toolbarWindow.isFocused()) return true;
    for (const window of this.#childWindowsByName.values()) {
      if (window.isFocused()) return true;
    }
    return false;
  }

  private toggleToolbarOnTop(onTop: boolean): void {
    this.#toolbarWindow.setAlwaysOnTop(onTop);
    for (const window of this.#childWindowsByName.values()) {
      window.setAlwaysOnTop(onTop);
    }
  }

  private didStartDragging(): void {
    this.#preDragVisibleChildWindowIds = [];
    for (const window of this.#childWindowsByName.values()) {
      if (window.isVisible()) this.#preDragVisibleChildWindowIds.push(window.id);
    }
    this.hideToolbarWindow();
  }

  private didStopDragging(): void {
    this.#toolbarIsVisible = true;
    this.#toolbarWindow.show();
    for (const window of this.#childWindowsByName.values()) {
      if (this.#preDragVisibleChildWindowIds.includes(window.id)) window.show();
    }
    this.#preDragVisibleChildWindowIds.length = 0;
    this.toggleToolbarOnTop(true);
  }

  private appExit(): void {
    if (this.#exited) return;
    this.#exited = true;

    console.warn('EXITING CHROMEALIVE!');
    try {
      this.#nsEventMonitor?.stop();
      this.#api.close();
    } catch (err) {
      console.error('ERROR shutting down', err);
    }
    app.exit();
  }

  private async appReady(): Promise<void> {
    try {
      await this.#api.connect();
      await this.createToolbarWindow();
      this.listenForMouseDown();
      app.once('before-quit', () => this.appExit());
      ShutdownHandler.register(() => this.appExit());

      this.emit('ready');
    } catch (error) {
      console.error('ERROR in appReady: ', error);
    }
  }

  private listenForMouseDown(): void {
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

  private async createToolbarWindow(): Promise<void> {
    const mainScreen = screen.getPrimaryDisplay();
    const workarea = mainScreen.workArea;

    this.#toolbarWindow = new BrowserWindow({
      show: false,
      frame: false,
      roundedCorners: false,
      focusable: false,
      movable: false,
      closable: false,
      resizable: false,
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
      },
      height: 44,
    });

    remoteMain.enable(this.#toolbarWindow.webContents);

    // for child windows
    this.#toolbarWindow.webContents.setWindowOpenHandler(details => {
      const isMenu = details.frameName.includes('Menu');
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          resizable: !isMenu,
          frame: !isMenu,
          roundedCorners: true,
          movable: !isMenu,
          closable: true,
          transparent: isMenu,
          titleBarStyle: 'default',
          alwaysOnTop: true,
          hasShadow: !isMenu,
          acceptFirstMouse: true,
          useContentSize: true,
          webPreferences: {
            preload: `${__dirname}/PagePreload.js`,
          },
        },
      };
    });

    this.#toolbarWindow.webContents.on('did-create-window', (childWindow, details) => {
      this.trackChildWindow(childWindow, details);
    });

    this.#toolbarWindow.on('close', () => app.exit());
    this.#toolbarWindow.webContents.on('ipc-message', (e, eventName, ...args) => {
      if (eventName === 'App:mousemove') {
        // move back to top
        if (this.#toolbarIsVisible && this.#toolbarWindow.isAlwaysOnTop()) {
          this.toggleToolbarOnTop(true);
        }
      } else if (eventName === 'App:changeHeight') {
        this.#toolbarWindow.setBounds({
          height: args[0],
        });
      } else if (eventName === 'App:showChildWindow') {
        const frameName = args[0];
        this.#childWindowsByName.get(frameName)?.show();
      } else if (eventName === 'App:hideChildWindow') {
        const frameName = args[0];
        this.#childWindowsByName.get(frameName)?.hide();
      }
    });

    const vueServerAddress = await this.#vueAddress;
    await this.#toolbarWindow.loadURL(`http://localhost:${vueServerAddress.port}/toolbar.html`);

    await this.injectCoreServer(this.#toolbarWindow);

    const workareaBounds = {
      left: workarea.x,
      top: workarea.y,
      ...workarea,
      scale: mainScreen.scaleFactor,
    };
    await this.#api.send('App.ready', {
      workarea: workareaBounds,
      vueServer: `http://localhost:${vueServerAddress.port}`,
    });
  }

  private trackChildWindow(childWindow: BrowserWindow, details: { frameName: string }): void {
    const { frameName } = details;
    if (this.#childWindowsByName.has(frameName)) {
      throw new Error(`Child window with the same frameName already exists: ${frameName}`);
    }
    this.#childWindowsByName.set(frameName, childWindow);
    childWindow.webContents.on('ipc-message', (e, eventName, ...args) => {
      if (eventName === 'chromealive:api') {
        const [api, apiArgs] = args;
        if (api === 'File:navigate') {
          const { filepath } = apiArgs;
          shell.showItemInFolder(filepath);
        }
      }
    });

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
      this.#childWindowsByName.delete(frameName);
    });
  }

  private async injectCoreServer(window: BrowserWindow): Promise<void> {
    await window.webContents.executeJavaScript(
      `(() => {
        const coreServerAddress = '${this.coreServerAddress ?? ''}';
        if (coreServerAddress) {
          window.heroServerUrl = coreServerAddress;
          if ('setHeroServerUrl' in window) window.setHeroServerUrl(coreServerAddress);
        }
      })()`,
    );
  }

  private moveToolbarWindow(move: IAppMoveEvent): void {
    const bounds = this.#toolbarWindow.getBounds();
    if (bounds.x !== move.bounds.x || bounds.y !== move.bounds.y) {
      bounds.x = move.bounds.x;
      bounds.y = move.bounds.y;
      this.#toolbarWindow.setPosition(move.bounds.x, move.bounds.y);
    }
    if (bounds.width !== move.bounds.width) {
      bounds.width = move.bounds.width;
      this.#toolbarWindow.setBounds(bounds);
    }
  }

  private onChromeAliveEvent<T extends keyof IChromeAliveEvents>(
    eventType: T,
    data: IChromeAliveEvents[T],
  ): void {
    if (this.#exited) return;

    if (eventType === 'App.startedDraggingChrome') {
      this.didStartDragging();
    }
    if (eventType === 'App.stoppedDraggingChrome') {
      this.didStopDragging();
    }
    if (eventType === 'App.show') {
      const onTop = (data as any).onTop ?? true;
      this.showToolbarWindow(onTop);
    }
    if (eventType === 'App.hide') {
      this.hideToolbarWindow();
    }
    if (eventType === 'App.quit') {
      this.appExit();
    }
    if (eventType === 'App.moveTo') {
      this.moveToolbarWindow(data as IAppMoveEvent);
    }
  }
}
