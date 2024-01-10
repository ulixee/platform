"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _ChromeAliveWindow_childWindowsByName, _ChromeAliveWindow_toolbarView, _ChromeAliveWindow_toolbarHeight, _ChromeAliveWindow_activeTabIdx, _ChromeAliveWindow_replayTabs, _ChromeAliveWindow_mainView, _ChromeAliveWindow_showingPopupName, _ChromeAliveWindow_hasShown, _ChromeAliveWindow_addTabQueue, _ChromeAliveWindow_eventSubscriber;
Object.defineProperty(exports, "__esModule", { value: true });
const EventSubscriber_1 = require("@ulixee/commons/lib/EventSubscriber");
const Queue_1 = require("@ulixee/commons/lib/Queue");
const utils_1 = require("@ulixee/commons/lib/utils");
const hero_core_1 = require("@ulixee/hero-core");
const electron_1 = require("electron");
const nanoid_1 = require("nanoid");
const Path = require("path");
const moment = require("moment");
const generateContextMenu_1 = require("../menus/generateContextMenu");
const ApiClient_1 = require("./ApiClient");
const View_1 = require("./View");
// make electron packaging friendly
const extensionPath = Path.resolve(__dirname, '../ui').replace('app.asar', 'app.asar.unpacked');
class ChromeAliveWindow {
    constructor(session, staticServer, cloudAddress) {
        this.session = session;
        this.staticServer = staticServer;
        this.enableDevtoolsOnDevtools = process.env.DEVTOOLS ?? false;
        _ChromeAliveWindow_childWindowsByName.set(this, new Map());
        _ChromeAliveWindow_toolbarView.set(this, void 0);
        _ChromeAliveWindow_toolbarHeight.set(this, 44);
        _ChromeAliveWindow_activeTabIdx.set(this, 0);
        _ChromeAliveWindow_replayTabs.set(this, []);
        _ChromeAliveWindow_mainView.set(this, void 0);
        _ChromeAliveWindow_showingPopupName.set(this, void 0);
        _ChromeAliveWindow_hasShown.set(this, false);
        _ChromeAliveWindow_addTabQueue.set(this, new Queue_1.default('TAB CREATOR', 1));
        _ChromeAliveWindow_eventSubscriber.set(this, new EventSubscriber_1.default());
        (0, utils_1.bindFunctions)(this);
        this.createApi(cloudAddress);
        const mainScreen = electron_1.screen.getPrimaryDisplay();
        const workarea = mainScreen.workArea;
        this.window = new electron_1.BrowserWindow({
            show: false,
            acceptFirstMouse: true,
            webPreferences: {
                contextIsolation: true,
                sandbox: true,
                partition: (0, nanoid_1.nanoid)(5),
            },
            titleBarStyle: 'hiddenInset',
            icon: Path.resolve(electron_1.app.getAppPath(), 'assets', 'icon.png'),
            width: workarea.width,
            height: workarea.height,
            y: workarea.y,
            x: workarea.x,
        });
        this.window.title = `${this.session.heroSessionId}`;
        __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").on(this.window, 'resize', this.relayout);
        __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").on(this.window, 'maximize', this.relayout);
        __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").on(this.window, 'restore', this.relayout);
        __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").on(this.window, 'unmaximize', this.relayout);
        __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").on(this.window, 'close', this.onClose);
        __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").on(this.window, 'blur', () => {
            const finderMenu = __classPrivateFieldGet(this, _ChromeAliveWindow_childWindowsByName, "f").get('MenuFinder');
            if (finderMenu) {
                finderMenu.setAlwaysOnTop(false);
                finderMenu.moveAbove(this.window.getMediaSourceId());
            }
        });
        __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").on(this.window, 'focus', () => {
            __classPrivateFieldGet(this, _ChromeAliveWindow_childWindowsByName, "f").get('MenuFinder')?.setAlwaysOnTop(true);
        });
        __classPrivateFieldSet(this, _ChromeAliveWindow_mainView, new View_1.default(this.window, {
            preload: `${__dirname}/ChromeAlivePagePreload.js`,
        }), "f");
        __classPrivateFieldGet(this, _ChromeAliveWindow_mainView, "f").attach();
        __classPrivateFieldGet(this, _ChromeAliveWindow_mainView, "f").hide();
        __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").on(__classPrivateFieldGet(this, _ChromeAliveWindow_mainView, "f").browserView.webContents, 'focus', this.closeOpenPopup);
        __classPrivateFieldSet(this, _ChromeAliveWindow_toolbarView, new View_1.default(this.window, {
            preload: `${__dirname}/ChromeAlivePagePreload.js`,
        }), "f");
        __classPrivateFieldGet(this, _ChromeAliveWindow_toolbarView, "f").attach();
        // for child windows
        __classPrivateFieldGet(this, _ChromeAliveWindow_toolbarView, "f").webContents.setWindowOpenHandler(details => {
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
        const toolbarWc = __classPrivateFieldGet(this, _ChromeAliveWindow_toolbarView, "f").webContents;
        __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").on(toolbarWc, 'did-create-window', (childWindow, details) => {
            childWindow.moveAbove(this.window.getMediaSourceId());
            this.trackChildWindow(childWindow, details);
        });
        if (process.env.DEVTOOLS) {
            __classPrivateFieldGet(this, _ChromeAliveWindow_toolbarView, "f").webContents.openDevTools({ mode: 'detach' });
        }
        __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").on(toolbarWc, 'ipc-message', (e, eventName, ...args) => {
            if (eventName === 'App:changeHeight') {
                __classPrivateFieldSet(this, _ChromeAliveWindow_toolbarHeight, args[0], "f");
                void this.relayout();
            }
            else if (eventName === 'App:showChildWindow') {
                const frameName = args[0];
                const window = __classPrivateFieldGet(this, _ChromeAliveWindow_childWindowsByName, "f").get(frameName);
                window?.show();
                window?.focusOnWebView();
            }
            else if (eventName === 'App:hideChildWindow') {
                __classPrivateFieldGet(this, _ChromeAliveWindow_childWindowsByName, "f").get(args[0])?.close();
            }
        });
    }
    get activeTab() {
        return __classPrivateFieldGet(this, _ChromeAliveWindow_replayTabs, "f")[__classPrivateFieldGet(this, _ChromeAliveWindow_activeTabIdx, "f")];
    }
    replayControl(direction) {
        void this.api?.send('Session.timetravel', {
            step: direction,
        });
    }
    async load() {
        await this.api.connect();
        await this.addReplayTab();
        await this.relayout();
        await __classPrivateFieldGet(this, _ChromeAliveWindow_toolbarView, "f").webContents.loadURL(this.staticServer.getPath('toolbar.html'));
        await __classPrivateFieldGet(this, _ChromeAliveWindow_toolbarView, "f").webContents.executeJavaScript(`
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
        await this.injectCloudAddress(__classPrivateFieldGet(this, _ChromeAliveWindow_toolbarView, "f").browserView);
    }
    async onClose() {
        for (const win of __classPrivateFieldGet(this, _ChromeAliveWindow_childWindowsByName, "f").values()) {
            if (win.webContents?.isDevToolsOpened())
                win.webContents.closeDevTools();
            win.close();
        }
        if (__classPrivateFieldGet(this, _ChromeAliveWindow_toolbarView, "f").webContents.isDevToolsOpened()) {
            __classPrivateFieldGet(this, _ChromeAliveWindow_toolbarView, "f").webContents.closeDevTools();
        }
        __classPrivateFieldGet(this, _ChromeAliveWindow_toolbarView, "f").webContents.close();
        for (const tab of __classPrivateFieldGet(this, _ChromeAliveWindow_replayTabs, "f")) {
            tab.view.webContents.close();
        }
        __classPrivateFieldGet(this, _ChromeAliveWindow_childWindowsByName, "f").clear();
        __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").close();
        await this.api?.send('Session.close');
        await this.api?.disconnect();
    }
    async reconnect(address) {
        if (this.api?.address.includes(address))
            return;
        if (this.api?.isConnected) {
            await this.api.disconnect();
        }
        this.createApi(address);
        await this.api.connect();
        for (const tab of __classPrivateFieldGet(this, _ChromeAliveWindow_replayTabs, "f")) {
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
                const { targetId, browserContextId } = await View_1.default.getTargetInfo(devtoolsWc);
                await this.api.send('Session.devtoolsTargetOpened', {
                    isReconnect: true,
                    targetId,
                    browserContextId,
                });
            }
        }
        await Promise.all([
            this.injectCloudAddress(__classPrivateFieldGet(this, _ChromeAliveWindow_toolbarView, "f").browserView),
            this.injectCloudAddress(__classPrivateFieldGet(this, _ChromeAliveWindow_mainView, "f").browserView),
        ]);
    }
    // NOTE: 1 is the default hero tab id for an incognito context. DOES NOT WORK in default context
    async addReplayTab(heroTabId = 1) {
        await __classPrivateFieldGet(this, _ChromeAliveWindow_addTabQueue, "f").run(async () => {
            if (__classPrivateFieldGet(this, _ChromeAliveWindow_replayTabs, "f").some(x => x.heroTabId === heroTabId))
                return;
            const view = new View_1.default(this.window, {
                partition: `persist:${(0, nanoid_1.nanoid)(5)}`,
                webSecurity: false,
            });
            view.browserView.setAutoResize({ width: true, height: true });
            view.attach();
            view.webContents.on('focus', () => {
                if (!__classPrivateFieldGet(this, _ChromeAliveWindow_showingPopupName, "f")?.startsWith('MenuFinder'))
                    this.closeOpenPopup();
            });
            await view.webContents.session.loadExtension(extensionPath, {
                allowFileAccess: true,
            });
            if (this.enableDevtoolsOnDevtools)
                await this.addDevtoolsOnDevtools(view);
            __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").on(view.webContents, 'devtools-opened', async () => {
                const devtoolsWc = view.webContents.devToolsWebContents;
                if (!devtoolsWc) {
                    console.warn('No web contents on showing devtools');
                    return;
                }
                void devtoolsWc.executeJavaScript(`(async () => {
          window.addEventListener("message", (event) => {
            event.source.postMessage({ 
              action: 'returnCloudAddress', 
              cloudAddress: '${this.api.address}' 
            }, event.origin);
          }, false);
        UI.inspectorView.tabbedPane.closeTabs(['timeline', 'heap_profiler', 'lighthouse', 'security', 'resources', 'network', 'sources']);
        
        for (let i =0; i < 50; i+=1) {
           const tab = UI.inspectorView.tabbedPane.tabs.find(x => x.titleInternal === 'Hero Script');
           if (tab) {    
             UI.inspectorView.tabbedPane.insertBefore(tab, 0);
             UI.inspectorView.tabbedPane.selectTab(tab.id);
             break;
           }
           await new Promise(requestAnimationFrame);
        }
      })()`);
                const target = await View_1.default.getTargetInfo(devtoolsWc);
                await this.api.send('Session.devtoolsTargetOpened', target);
            });
            view.webContents.on('context-menu', (ev, params) => {
                const menu = (0, generateContextMenu_1.default)(params, view.webContents);
                menu.append(new electron_1.MenuItem({
                    label: 'Generate Selector',
                    click: () => {
                        view.webContents.inspectElement(params.x, params.y);
                        void this.api.send('Session.openMode', {
                            mode: 'Finder',
                            position: { x: params.x, y: params.y },
                            trigger: 'contextMenu',
                        });
                    },
                }));
                menu.popup();
            });
            await view.webContents.loadURL('about:blank');
            view.webContents.openDevTools({ mode: 'bottom' });
            const { targetId, browserContextId } = await View_1.default.getTargetInfo(view.webContents);
            const chromeTabId = view.webContents.id;
            __classPrivateFieldGet(this, _ChromeAliveWindow_replayTabs, "f").push({ view, targetId, heroTabId, browserContextId, chromeTabId });
            await this.api.send('Session.replayTargetCreated', {
                targetId,
                browserContextId,
                heroTabId,
                chromeTabId,
            });
        });
    }
    createApi(baseHost) {
        const address = new URL(`/chromealive/${this.session.heroSessionId}`, baseHost);
        if (!this.session.dbPath.includes(hero_core_1.default.dataDir)) {
            address.searchParams.set('path', this.session.dbPath);
        }
        this.api = new ApiClient_1.default(address.href, this.onChromeAliveEvent);
        // eslint-disable-next-line no-console
        console.log('Window connected to %s', this.api.address);
        __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").once(this.api, 'close', this.onApiClose);
    }
    async injectCloudAddress(view) {
        if (!this.api.address)
            return;
        await view.webContents.executeJavaScript(`(() => {
        window.cloudAddress = '${this.api.address}';
        if ('setCloudAddress' in window) window.setCloudAddress(window.cloudAddress);
      })()`);
    }
    onApiClose() {
        __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").off({ emitter: this.api, eventName: 'close', handler: this.onApiClose });
        this.api = null;
    }
    async addDevtoolsOnDevtools(view) {
        const devtoolsOnDevtoolsWindow = new electron_1.BrowserWindow({
            show: false,
        });
        await devtoolsOnDevtoolsWindow.webContents.session.loadExtension(extensionPath, {
            allowFileAccess: true,
        });
        devtoolsOnDevtoolsWindow.show();
        view.webContents.setDevToolsWebContents(devtoolsOnDevtoolsWindow.webContents);
        devtoolsOnDevtoolsWindow.webContents.openDevTools({ mode: 'undocked' });
    }
    async activateView(mode) {
        let needsLayout;
        if (mode === 'Live' || mode === 'Timetravel' || mode === 'Finder') {
            if (this.activeTab) {
                needsLayout = this.activeTab.view.isHidden;
                this.activeTab.view.isHidden = false;
            }
            __classPrivateFieldGet(this, _ChromeAliveWindow_mainView, "f").hide();
        }
        else {
            needsLayout = __classPrivateFieldGet(this, _ChromeAliveWindow_mainView, "f").isHidden;
            this.activeTab?.view.hide();
            __classPrivateFieldGet(this, _ChromeAliveWindow_mainView, "f").isHidden = false;
            const page = ChromeAliveWindow.pages[mode];
            if (page) {
                const url = this.staticServer.getPath(page);
                if (__classPrivateFieldGet(this, _ChromeAliveWindow_mainView, "f").webContents.getURL() !== url) {
                    await __classPrivateFieldGet(this, _ChromeAliveWindow_mainView, "f").webContents.loadURL(url);
                    await this.injectCloudAddress(__classPrivateFieldGet(this, _ChromeAliveWindow_mainView, "f").browserView);
                    if (mode === 'Output') {
                        await __classPrivateFieldGet(this, _ChromeAliveWindow_mainView, "f").webContents.openDevTools({ mode: 'bottom' });
                        const view = __classPrivateFieldGet(this, _ChromeAliveWindow_mainView, "f");
                        __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").on(view.webContents, 'devtools-opened', () => {
                            const devtoolsWc = view.webContents.devToolsWebContents;
                            void devtoolsWc?.executeJavaScript(`(() => {
        UI.inspectorView.tabbedPane.closeTabs(['timeline', 'heap_profiler', 'lighthouse', 'security', 'resources', 'network', 'sources', 'elements']);
      })()`);
                        });
                    }
                }
            }
        }
        if (needsLayout)
            await this.relayout();
    }
    async relayout() {
        const { width, height } = this.window.getContentBounds();
        __classPrivateFieldGet(this, _ChromeAliveWindow_toolbarView, "f").setBounds({ height: __classPrivateFieldGet(this, _ChromeAliveWindow_toolbarHeight, "f"), x: 0, y: 0, width });
        const heightoffset = __classPrivateFieldGet(this, _ChromeAliveWindow_toolbarHeight, "f");
        const remainingBounds = {
            x: 0,
            y: heightoffset + 1,
            width,
            height: height - heightoffset,
        };
        if (!__classPrivateFieldGet(this, _ChromeAliveWindow_mainView, "f").isHidden)
            await __classPrivateFieldGet(this, _ChromeAliveWindow_mainView, "f").setBounds(remainingBounds);
        if (!this.activeTab?.view?.isHidden)
            await this.activeTab.view.setBounds(remainingBounds);
    }
    closeOpenPopup() {
        try {
            __classPrivateFieldGet(this, _ChromeAliveWindow_childWindowsByName, "f").get(__classPrivateFieldGet(this, _ChromeAliveWindow_showingPopupName, "f"))?.close();
            __classPrivateFieldGet(this, _ChromeAliveWindow_childWindowsByName, "f").delete(__classPrivateFieldGet(this, _ChromeAliveWindow_showingPopupName, "f"));
        }
        catch { }
        __classPrivateFieldSet(this, _ChromeAliveWindow_showingPopupName, null, "f");
    }
    onChromeAliveEvent(eventType, data) {
        if (eventType === 'Session.updated') {
            const session = data;
            let scriptEntrypoint = session.scriptEntrypoint;
            const divider = scriptEntrypoint.includes('/') ? '/' : '\\';
            scriptEntrypoint = scriptEntrypoint.split(divider).slice(-2).join(divider);
            const title = `${scriptEntrypoint} (${moment(session.startTime).format('MMM D [at] h:mm a')})`;
            if (this.window.title !== title) {
                this.window.setTitle(title);
                void __classPrivateFieldGet(this, _ChromeAliveWindow_toolbarView, "f").webContents.executeJavaScript(`document.title="${title}"`);
            }
        }
        if (eventType === 'Session.loaded' && !__classPrivateFieldGet(this, _ChromeAliveWindow_hasShown, "f")) {
            this.window.show();
            __classPrivateFieldSet(this, _ChromeAliveWindow_hasShown, true, "f");
        }
        if (eventType === 'DevtoolsBackdoor.toggleInspectElementMode') {
            this.activeTab.view.webContents.focus();
        }
        if (eventType === 'Session.tabCreated') {
            const createdTab = data;
            void this.addReplayTab(createdTab.tabId);
        }
        if (eventType === 'Session.appMode') {
            const mode = data.mode;
            const isFinderPopup = __classPrivateFieldGet(this, _ChromeAliveWindow_showingPopupName, "f")?.startsWith('MenuFinder') && mode === 'Finder';
            if (!isFinderPopup)
                this.closeOpenPopup();
            void this.activateView(mode);
        }
    }
    trackChildWindow(childWindow, details) {
        const { frameName } = details;
        if (__classPrivateFieldGet(this, _ChromeAliveWindow_childWindowsByName, "f").has(frameName)) {
            throw new Error(`Child window with the same frameName already exists: ${frameName}`);
        }
        __classPrivateFieldGet(this, _ChromeAliveWindow_childWindowsByName, "f").set(frameName, childWindow);
        const onIpcMessage = __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").on(childWindow.webContents, 'ipc-message', (e, eventName, ...args) => {
            if (eventName === 'chromealive:api') {
                const [command, apiArgs] = args;
                if (command === 'File:navigate') {
                    const { filepath } = apiArgs;
                    electron_1.shell.showItemInFolder(filepath);
                }
            }
            else if (eventName === 'App:changeHeight') {
                childWindow.setBounds({
                    height: Math.round(args[0]),
                });
            }
        });
        const onshow = __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").on(childWindow, 'show', () => {
            if (__classPrivateFieldGet(this, _ChromeAliveWindow_showingPopupName, "f") === frameName)
                return;
            this.closeOpenPopup();
            __classPrivateFieldSet(this, _ChromeAliveWindow_showingPopupName, frameName, "f");
        });
        let hasHandled = false;
        childWindow.once('close', async (e) => {
            __classPrivateFieldGet(this, _ChromeAliveWindow_eventSubscriber, "f").off(onshow, onIpcMessage);
            if (__classPrivateFieldGet(this, _ChromeAliveWindow_showingPopupName, "f") === frameName)
                __classPrivateFieldSet(this, _ChromeAliveWindow_showingPopupName, null, "f");
            const popup = __classPrivateFieldGet(this, _ChromeAliveWindow_childWindowsByName, "f").get(frameName);
            __classPrivateFieldGet(this, _ChromeAliveWindow_childWindowsByName, "f").delete(frameName);
            if (!hasHandled && popup) {
                hasHandled = true;
                e.preventDefault();
                await popup?.webContents.executeJavaScript('window.dispatchEvent(new CustomEvent("manual-close"))');
                try {
                    popup?.close();
                }
                catch { }
            }
        });
    }
}
exports.default = ChromeAliveWindow;
_ChromeAliveWindow_childWindowsByName = new WeakMap(), _ChromeAliveWindow_toolbarView = new WeakMap(), _ChromeAliveWindow_toolbarHeight = new WeakMap(), _ChromeAliveWindow_activeTabIdx = new WeakMap(), _ChromeAliveWindow_replayTabs = new WeakMap(), _ChromeAliveWindow_mainView = new WeakMap(), _ChromeAliveWindow_showingPopupName = new WeakMap(), _ChromeAliveWindow_hasShown = new WeakMap(), _ChromeAliveWindow_addTabQueue = new WeakMap(), _ChromeAliveWindow_eventSubscriber = new WeakMap();
ChromeAliveWindow.pages = {
    Input: '/screen-input.html',
    Output: '/screen-output.html',
    Reliability: '/screen-reliability.html',
};
//# sourceMappingURL=ChromeAliveWindow.js.map