import { app, BrowserWindow, screen, shell } from 'electron';
import * as Path from 'path';
import { nanoid } from 'nanoid';
import * as Fs from 'fs';
import ISessionAppModeEvent from '@ulixee/desktop-interfaces/events/ISessionAppModeEvent';
import IChromeAliveSessionEvents from '@ulixee/desktop-interfaces/events/IChromeAliveSessionEvents';
import { IChromeAliveSessionApis } from '@ulixee/desktop-interfaces/apis';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import Queue from '@ulixee/commons/lib/Queue';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import moment = require('moment');
import View from './View';
import StaticServer from './StaticServer';
import ChromeAliveApi from './ChromeAliveApi';
import BrowserView = Electron.BrowserView;

// make electron packaging friendly
const extensionPath = Path.resolve(__dirname, '../ui').replace('app.asar', 'app.asar.unpacked');
interface IReplayTab {
  view: View;
  heroTabId: number;
  targetId: string;
  browserContextId: string;
  chromeTabId: number;
}
export default class ChromeAliveWindow {
  private static pages = {
    Input: '/screen-input.html',
    Output: '/screen-output.html',
    Reliability: '/screen-reliability.html',
  } as const;

  private static hasUpdatedApiPath = false;

  window: BrowserWindow;
  api: ChromeAliveApi<IChromeAliveSessionApis, IChromeAliveSessionEvents>;
  enableDevtoolsOnDevtools = false;

  private get activeTab(): IReplayTab {
    return this.#replayTabs[this.#activeTabIdx];
  }

  #childWindowsByName = new Map<string, BrowserWindow>();
  #toolbarView: View;
  #toolbarHeight = 44;
  #activeTabIdx = 0;
  #replayTabs: IReplayTab[] = [];
  #mainView: View;
  #showingPopupName: string;
  #hasShown = false;
  #addTabQueue = new Queue('TAB CREATOR', 1);

  #eventSubscriber = new EventSubscriber();

  constructor(
    public readonly session: {
      heroSessionId: string;
      dbPath: string;
    },
    private staticServer: StaticServer,
    public minerAddress: string,
  ) {
    bindFunctions(this);
    this.createApi();

    const mainScreen = screen.getPrimaryDisplay();
    const workarea = mainScreen.workArea;

    this.window = new BrowserWindow({
      show: false,
      acceptFirstMouse: true,
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        partition: nanoid(5),
      },
      titleBarStyle: 'hiddenInset',
      icon: Path.resolve(app.getAppPath(), 'assets', 'icon.png'),
      width: workarea.width,
      height: workarea.height,
      y: workarea.y,
      x: workarea.x,
    });

    this.window.title = `${this.session.heroSessionId}`;
    this.#eventSubscriber.on(this.window, 'resize', this.relayout);
    this.#eventSubscriber.on(this.window, 'maximize', this.relayout);
    this.#eventSubscriber.on(this.window, 'restore', this.relayout);
    this.#eventSubscriber.on(this.window, 'unmaximize', this.relayout);
    this.#eventSubscriber.on(this.window, 'close', this.onClose);
    this.#eventSubscriber.on(this.window, 'blur', () => {
      const finderMenu = this.#childWindowsByName.get('MenuFinder');
      if (finderMenu) {
        finderMenu.setAlwaysOnTop(false);
        finderMenu.moveAbove(this.window.getMediaSourceId());
      }
    });
    this.#eventSubscriber.on(this.window, 'focus', () => {
      this.#childWindowsByName.get('MenuFinder')?.setAlwaysOnTop(true);
    });

    this.#mainView = new View(this.window, {
      preload: `${__dirname}/ChromeAlivePagePreload.js`,
    });
    this.#mainView.attach();
    this.#mainView.hide();
    this.#eventSubscriber.on(this.#mainView.browserView.webContents, 'focus', this.closeOpenPopup);

    this.#toolbarView = new View(this.window, {
      preload: `${__dirname}/ChromeAlivePagePreload.js`,
    });
    this.#toolbarView.attach();
    // for child windows
    this.#toolbarView.webContents.setWindowOpenHandler(details => {
      const isMenu = details.frameName.includes('Menu');
      const canMoveAndResize = !isMenu || details.frameName.startsWith('MenuFinder');
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
          alwaysOnTop: details.frameName.startsWith('MenuFinder'),
          hasShadow: !isMenu,
          acceptFirstMouse: true,
          useContentSize: true,
          webPreferences: {
            preload: `${__dirname}/ChromeAlivePagePreload.js`,
          },
        },
      };
    });

    const toolbarWc = this.#toolbarView.webContents;
    this.#eventSubscriber.on(toolbarWc, 'did-create-window', (childWindow, details) => {
      childWindow.moveAbove(this.window.getMediaSourceId());
      this.trackChildWindow(childWindow, details);
    });

    this.#toolbarView.webContents.openDevTools({ mode: 'detach' });
    this.#eventSubscriber.on(toolbarWc, 'ipc-message', (e, eventName, ...args) => {
      if (eventName === 'App:changeHeight') {
        this.#toolbarHeight = args[0];
        void this.relayout();
      } else if (eventName === 'App:showChildWindow') {
        const frameName = args[0];
        const window = this.#childWindowsByName.get(frameName);
        window?.show();
        window?.focusOnWebView();
      } else if (eventName === 'App:hideChildWindow') {
        this.#childWindowsByName.get(args[0])?.close();
      }
    });
  }

  replayControl(direction: 'back' | 'forward'): void {
    void this.api?.send('Session.timetravel', {
      step: direction,
    });
  }

  async load(): Promise<void> {
    await this.api.connect();
    await this.addReplayTab();
    await this.relayout();
    await this.#toolbarView.webContents.loadURL(this.staticServer.getPath('toolbar.html'));
    await this.#toolbarView.webContents.executeJavaScript(`
        const elem = document.querySelector('body > #app');
        const resizeObserver = new ResizeObserver(() => {
          document.dispatchEvent(
            new CustomEvent('App:changeHeight', {
              detail: {
                height:elem.getBoundingClientRect().height,
              },
            }),
          );
        });
        resizeObserver.observe(elem);
      `);

    await this.injectMinerAddress(this.#toolbarView.browserView);
  }

  public async onClose(): Promise<void> {
    for (const win of this.#childWindowsByName.values()) {
      if (win.webContents?.isDevToolsOpened()) win.webContents.closeDevTools();
      win.close();
    }
    this.#childWindowsByName.clear();
    this.#eventSubscriber.close();
    await this.api?.send('Session.close');
    await this.api?.disconnect();
  }

  public async reconnect(address: string): Promise<void> {
    this.minerAddress = address;
    this.createApi();

    await this.api.connect();
    for (const tab of this.#replayTabs) {
      const webContents = tab.view.webContents;

      await this.api.send('Session.replayTargetCreated', {
        browserContextId: tab.browserContextId,
        targetId: tab.targetId,
        chromeTabId: tab.chromeTabId,
        heroTabId: tab.heroTabId,
        isReconnect: true,
      });
      const devtoolsWc = webContents.devToolsWebContents;
      if (devtoolsWc) {
        const { targetId, browserContextId } = await View.getTargetInfo(devtoolsWc);

        await this.api.send('Session.devtoolsTargetOpened', {
          isReconnect: true,
          targetId,
          browserContextId,
        });
      }
    }
    await Promise.all([
      this.injectMinerAddress(this.#toolbarView.browserView),
      this.injectMinerAddress(this.#mainView.browserView),
    ]);
  }

  // NOTE: 1 is the default hero tab id for an incognito context. DOES NOT WORK in default context
  private async addReplayTab(heroTabId = 1): Promise<void> {
    await this.#addTabQueue.run(async () => {
      if (this.#replayTabs.some(x => x.heroTabId === heroTabId)) return;
      const view = new View(this.window, {
        partition: `persist:${nanoid(5)}`,
      });
      view.browserView.setAutoResize({ width: true, height: true });
      view.attach();
      await view.webContents.loadURL('about:blank');
      view.webContents.on('focus', () => {
        if (!this.#showingPopupName?.startsWith('MenuFinder')) this.closeOpenPopup();
      });
      await ChromeAliveWindow.replaceExtensionApiPath(this.api.address);

      await view.webContents.session.loadExtension(extensionPath, {
        allowFileAccess: true,
      });
      if (this.enableDevtoolsOnDevtools) await this.addDevtoolsOnDevtools(view);
      this.#eventSubscriber.on(view.webContents, 'devtools-opened', async () => {
        const devtoolsWc = view.webContents.devToolsWebContents;
        if (!devtoolsWc) {
          console.warn('No web contents on showing devtools');
          return;
        }
        void devtoolsWc.executeJavaScript(
          `(async () => {
        UI.inspectorView.tabbedPane.closeTabs(['timeline', 'heap_profiler', 'lighthouse', 'security', 'resources', 'network', 'sources']);
        
        for (let i =0; i < 100; i+=1) {
           const tab = UI.inspectorView.tabbedPane.tabs.find(x => x.titleInternal === 'Hero Script');
           if (tab) {    
             UI.inspectorView.tabbedPane.insertBefore(tab, 0);
             UI.inspectorView.tabbedPane.selectTab(tab.id)
             break;
           }
           await new Promise(r => setTimeout(r, 100));
        }
      })()`,
        );
        const target = await View.getTargetInfo(devtoolsWc);
        await this.api.send('Session.devtoolsTargetOpened', target);
      });
      view.webContents.openDevTools({ mode: 'bottom' });
      view.addContextMenu();

      const { targetId, browserContextId } = await View.getTargetInfo(view.webContents);
      const chromeTabId = view.webContents.id;
      this.#replayTabs.push({ view, targetId, heroTabId, browserContextId, chromeTabId });
      await this.api.send('Session.replayTargetCreated', {
        targetId,
        browserContextId,
        heroTabId,
        chromeTabId,
      });
    });
  }

  private createApi(): void {
    this.api = new ChromeAliveApi(
      `${this.minerAddress}/${this.session.heroSessionId}`,
      this.onChromeAliveEvent,
    );
    // eslint-disable-next-line no-console
    console.log('Window connected to %s', this.api.address);
    this.#eventSubscriber.once(this.api, 'close', this.onApiClose);
  }

  private async injectMinerAddress(view: BrowserView): Promise<void> {
    if (!this.api.address) return;
    await view.webContents.executeJavaScript(
      `(() => {
        window.minerAddress = '${this.api.address}';
        if ('setMinerAddress' in window) window.setMinerAddress(window.minerAddress);
      })()`,
    );
  }

  private onApiClose(): void {
    this.#eventSubscriber.off({ emitter: this.api, eventName: 'close', handler: this.onApiClose });
    this.api = null;
  }

  private async addDevtoolsOnDevtools(view: View): Promise<void> {
    const devtoolsOnDevtoolsWindow = new BrowserWindow({
      show: false,
    });
    await devtoolsOnDevtoolsWindow.webContents.session.loadExtension(extensionPath, {
      allowFileAccess: true,
    });
    devtoolsOnDevtoolsWindow.show();
    view.webContents.setDevToolsWebContents(devtoolsOnDevtoolsWindow.webContents);
    devtoolsOnDevtoolsWindow.webContents.openDevTools({ mode: 'detach' });
  }

  private async activateView(mode: ISessionAppModeEvent['mode']): Promise<void> {
    let needsLayout: boolean;
    if (mode === 'Live' || mode === 'Timetravel' || mode === 'Finder') {
      if (this.activeTab) {
        needsLayout = this.activeTab.view.isHidden;
        this.activeTab.view.isHidden = false;
      }
      this.#mainView.hide();
    } else {
      needsLayout = this.#mainView.isHidden;
      this.activeTab?.view.hide();
      this.#mainView.isHidden = false;
      const page = ChromeAliveWindow.pages[mode];
      if (page) {
        const url = this.staticServer.getPath(page);
        if (this.#mainView.webContents.getURL() !== url) {
          await this.#mainView.webContents.loadURL(url);
          await this.injectMinerAddress(this.#mainView.browserView);
        }
      }
    }

    if (needsLayout) await this.relayout();
  }

  private async relayout(): Promise<void> {
    const { width, height } = this.window.getContentBounds();

    this.#toolbarView.setBounds({ height: this.#toolbarHeight, x: 0, y: 0, width });

    const heightoffset = this.#toolbarHeight;

    const remainingBounds = {
      x: 0,
      y: heightoffset + 1,
      width,
      height: height - heightoffset,
    };
    if (!this.#mainView.isHidden) await this.#mainView.setBounds(remainingBounds);
    if (!this.activeTab?.view?.isHidden) await this.activeTab.view.setBounds(remainingBounds);
  }

  private closeOpenPopup(): void {
    try {
      this.#childWindowsByName.get(this.#showingPopupName)?.close();
      this.#childWindowsByName.delete(this.#showingPopupName);
    } catch {}
    this.#showingPopupName = null;
  }

  private onChromeAliveEvent<T extends keyof IChromeAliveSessionEvents>(
    eventType: T,
    data: IChromeAliveSessionEvents[T],
  ): void {
    if (eventType === 'Session.updated') {
      const session = data as IChromeAliveSessionEvents['Session.updated'];
      let scriptEntrypoint = session.scriptEntrypoint;
      const divider = scriptEntrypoint.includes('/') ? '/' : '\\';
      scriptEntrypoint = scriptEntrypoint.split(divider).slice(-2).join(divider);
      const title = `${scriptEntrypoint} (${moment(session.startTime).format(
        'MMM D [at] h:mm a',
      )})`;
      if (this.window.title !== title) this.window.setTitle(title);
    }

    if (eventType === 'Session.loaded' && !this.#hasShown) {
      this.window.show();
      this.#hasShown = true;
    }

    if (eventType === 'DevtoolsBackdoor.toggleInspectElementMode') {
      this.activeTab.view.webContents.focus();
    }

    if (eventType === 'Session.tabCreated') {
      const createdTab = data as IChromeAliveSessionEvents['Session.tabCreated'];
      void this.addReplayTab(createdTab.tabId);
    }

    if (eventType === 'Session.appMode') {
      const mode = (data as IChromeAliveSessionEvents['Session.appMode']).mode;
      const isFinderPopup = this.#showingPopupName?.startsWith('MenuFinder') && mode === 'Finder';
      if (!isFinderPopup) this.closeOpenPopup();
      void this.activateView(mode);
    }
  }

  private trackChildWindow(childWindow: BrowserWindow, details: { frameName: string }): void {
    const { frameName } = details;
    if (this.#childWindowsByName.has(frameName)) {
      throw new Error(`Child window with the same frameName already exists: ${frameName}`);
    }

    this.#childWindowsByName.set(frameName, childWindow);
    const onIpcMessage = this.#eventSubscriber.on(
      childWindow.webContents,
      'ipc-message',
      (e, eventName, ...args) => {
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
      },
    );

    const onshow = this.#eventSubscriber.on(childWindow, 'show', () => {
      if (this.#showingPopupName === frameName) return;
      this.closeOpenPopup();
      this.#showingPopupName = frameName;
    });
    let hasHandled = false;
    childWindow.once('close', async e => {
      this.#eventSubscriber.off(onshow, onIpcMessage);
      if (this.#showingPopupName === frameName) this.#showingPopupName = null;
      const popup = this.#childWindowsByName.get(frameName);
      this.#childWindowsByName.delete(frameName);
      if (!hasHandled && popup) {
        hasHandled = true;
        e.preventDefault();
        await popup?.webContents.executeJavaScript(
          'window.dispatchEvent(new CustomEvent("manual-close"))',
        );
        popup?.close();
        return;
      }
    });
  }

  private static async replaceExtensionApiPath(address: string): Promise<void> {
    if (this.hasUpdatedApiPath) return;
    try {
      const filePath = `${extensionPath}/getMinerAddress.js`;
      await Fs.promises.writeFile(filePath, `window.minerAddress = "${address}";`);
      this.hasUpdatedApiPath = true;
    } catch (err) {
      throw new Error(`Could not launch ChromeAlive: ${err.message}`);
    }
  }
}
