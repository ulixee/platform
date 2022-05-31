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
  #hideOnTimeout: NodeJS.Timeout;
  #exited = false;
  #visibleWindowIdsToVisibleTime = new Map<number, number>();
  #lastWindowInteract = -1;
  #savedVisibleWindowIds = new Set<number>();
  #apiWantsToShowToolbar = false;

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
    this.#apiWantsToShowToolbar = false;
    clearTimeout(this.#hideOnTimeout);
    if (this.doesAnyAppWindowHaveFocus() || Date.now() - this.#lastWindowInteract < 500) {
      this.#hideOnTimeout = setTimeout(this.hideToolbarWindow.bind(this), 500);
      return;
    }
    this.#savedVisibleWindowIds.clear();
    for (const id of this.#visibleWindowIdsToVisibleTime.keys())
      this.#savedVisibleWindowIds.add(id);

    this.#toolbarWindow.hide();
    for (const window of this.#childWindowsByName.values()) {
      window.hide();
    }
  }

  private showToolbarWindow(): void {
    this.#apiWantsToShowToolbar = true;
    clearTimeout(this.#hideOnTimeout);
    if (!this.#toolbarWindow.isVisible()) {
      this.#toolbarWindow.showInactive();
    }
    for (const window of this.#childWindowsByName.values()) {
      if (window.isVisible()) continue;
      if (this.#savedVisibleWindowIds.has(window.id)) window.show();
    }
    this.#savedVisibleWindowIds.clear();
  }

  private onAppWindowBlurred(id: number): void {
    this.#lastWindowInteract = Date.now();
    this.#visibleWindowIdsToVisibleTime.delete(id);
    if (this.#apiWantsToShowToolbar === false) {
      clearTimeout(this.#hideOnTimeout);
      this.#hideOnTimeout = setTimeout(() => {
        // only run if still false
        if (this.#apiWantsToShowToolbar === false) this.hideToolbarWindow();
      }, 500);
    }
  }

  private doesAnyAppWindowHaveFocus(): boolean {
    if (
      this.#toolbarWindow.isFocused() ||
      this.#toolbarWindow.webContents.isFocused() ||
      this.#toolbarWindow.webContents.isDevToolsFocused()
    ) {
      return true;
    }
    // if any windows launched in last second, consider this "focused"
    const now = Date.now();
    for (const value of this.#visibleWindowIdsToVisibleTime.values()) {
      if (now - value < 500) return true;
    }
    for (const window of this.#childWindowsByName.values()) {
      if (
        window.isFocused() ||
        window.webContents.isFocused() ||
        window.webContents.isDevToolsFocused()
      ) {
        return true;
      }
    }
    return false;
  }

  private didStartDragging(): void {
    this.hideToolbarWindow();
  }

  private didStopDragging(): void {
    this.showToolbarWindow();
  }

  private appExit(): void {
    if (this.#exited) return;
    this.#exited = true;

    console.warn('EXITING CHROMEALIVE!');
    try {
      this.#nsEventMonitor?.stop();
      void this.#api.disconnect().catch(() => null);
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
    // TODO: add linux support
    // https://github.com/wilix-team/iohook (seems unstable, but possibly look at ideas?)

    if (process.platform === 'darwin') {
      if (this.#nsEventMonitor) return;
      // eslint-disable-next-line import/no-unresolved,global-require
      const { NSEventMonitor, NSEventMask } = require('nseventmonitor') as any;

      // https://developer.apple.com/documentation/appkit/nsevent/eventtype/leftmousedown
      enum NSEventType {
        LeftMouseDown = 1,
        LeftMouseUp = 2,
      }

      const monitor = new NSEventMonitor();
      monitor.start(NSEventMask.leftMouseDown | NSEventMask.leftMouseUp, ev => {
        this.#mouseDown = ev.type === NSEventType.LeftMouseDown;
        return this.#api.send('Mouse.state', { isMousedown: this.#mouseDown });
      });
      this.#nsEventMonitor = monitor;
    } else if (process.platform === 'win32') {
      // eslint-disable-next-line import/no-unresolved,global-require
      const mouseEvents = require('global-mouse-events') as any;
      mouseEvents.on('mousedown', ev => {
        this.#mouseDown = ev.type === 1;
        return this.#api.send('Mouse.state', { isMousedown: this.#mouseDown });
      });
      mouseEvents.on('mouseup', () => {
        this.#mouseDown = false;
        return this.#api.send('Mouse.state', { isMousedown: false });
      });
    }
  }

  private async createToolbarWindow(): Promise<void> {
    const mainScreen = screen.getPrimaryDisplay();
    const workarea = mainScreen.workArea;

    this.#toolbarWindow = new BrowserWindow({
      show: false,
      frame: false,
      roundedCorners: false,
      focusable: true,
      movable: false,
      closable: false,
      resizable: false,
      transparent: true,
      acceptFirstMouse: true,
      hasShadow: false,
      skipTaskbar: true,
      alwaysOnTop: true,
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
      const canMoveAndResize = !isMenu || details.frameName === 'MenuFinder';
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          resizable: canMoveAndResize,
          frame: !isMenu,
          roundedCorners: true,
          movable: canMoveAndResize,
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
    const id = this.#toolbarWindow.id;

    this.#toolbarWindow.on('show', () => {
      this.#visibleWindowIdsToVisibleTime.set(id, Date.now());
      if (this.#apiWantsToShowToolbar) this.showToolbarWindow();
    });

    this.#toolbarWindow.on('focus', () => {
      this.#visibleWindowIdsToVisibleTime.set(id, Date.now());
      if (this.#apiWantsToShowToolbar) this.showToolbarWindow();
    });

    this.#toolbarWindow.on('blur', () => this.onAppWindowBlurred(id));

    this.#toolbarWindow.on('close', () => app.exit());
    this.#toolbarWindow.webContents.on('ipc-message', (e, eventName, ...args) => {
      if (eventName === 'App:mousemove') {
        this.#lastWindowInteract = Date.now();
        clearTimeout(this.#hideOnTimeout);
        if (!this.#toolbarWindow.isVisible()) {
          this.#toolbarWindow.show();
          if (!this.#toolbarWindow.webContents.isFocused()) this.#toolbarWindow.focusOnWebView();
        }
      } else if (eventName === 'App:changeHeight') {
        this.#toolbarWindow.setBounds({
          height: args[0],
        });
      } else if (eventName === 'App:showChildWindow') {
        const frameName = args[0];
        const window = this.#childWindowsByName.get(frameName);
        window?.show();
        window?.focusOnWebView();
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
        const [command, apiArgs] = args;
        if (command === 'File:navigate') {
          const { filepath } = apiArgs;
          shell.showItemInFolder(filepath);
        }
      } else if (eventName === 'App:changeHeight') {
        childWindow.setBounds({
          height: Math.round(args[0]),
        });
      }
    });

    const id = childWindow.id;
    childWindow.on('show', () => {
      this.#visibleWindowIdsToVisibleTime.set(id, Date.now());
    });
    childWindow.on('focus', () => {
      this.#visibleWindowIdsToVisibleTime.set(id, Date.now());
    });
    childWindow.on('blur', () => this.onAppWindowBlurred(id));
    childWindow.on('hide', () => this.onAppWindowBlurred(id));
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
      this.showToolbarWindow();
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
