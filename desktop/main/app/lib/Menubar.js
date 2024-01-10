"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Menubar_tray, _Menubar_menuWindow, _Menubar_blurTimeout, _Menubar_nsEventMonitor, _Menubar_winMouseEvents, _Menubar_windowManager, _Menubar_isClosing, _Menubar_updateInfoPromise, _Menubar_installUpdateOnExit, _Menubar_downloadProgress, _Menubar_apiManager, _Menubar_argonFileOpen, _Menubar_options;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Menubar = void 0;
const electron_1 = require("electron");
const electron_log_1 = require("electron-log");
const electron_updater_1 = require("electron-updater");
const events_1 = require("events");
const Path = require("path");
const ApiManager_1 = require("./ApiManager");
const StaticServer_1 = require("./StaticServer");
const installDefaultChrome_1 = require("./util/installDefaultChrome");
const trayPositioner_1 = require("./util/trayPositioner");
const WindowManager_1 = require("./WindowManager");
const { version } = require('../package.json');
// Forked from https://github.com/maxogden/menubar
const iconPath = Path.resolve(__dirname, '..', 'assets', 'IconTemplate.png');
const uiDir = require.resolve('../index.js').replace('index.js', 'ui');
class Menubar extends events_1.EventEmitter {
    constructor(options) {
        super();
        _Menubar_tray.set(this, void 0);
        _Menubar_menuWindow.set(this, void 0);
        _Menubar_blurTimeout.set(this, null); // track blur events with timeout
        _Menubar_nsEventMonitor.set(this, void 0);
        _Menubar_winMouseEvents.set(this, void 0);
        _Menubar_windowManager.set(this, void 0);
        _Menubar_isClosing.set(this, false);
        _Menubar_updateInfoPromise.set(this, void 0);
        _Menubar_installUpdateOnExit.set(this, false);
        _Menubar_downloadProgress.set(this, 0);
        _Menubar_apiManager.set(this, void 0);
        _Menubar_argonFileOpen.set(this, void 0);
        _Menubar_options.set(this, void 0);
        __classPrivateFieldSet(this, _Menubar_options, options, "f");
        if (!electron_1.app.requestSingleInstanceLock()) {
            electron_1.app.quit();
            return;
        }
        // hide the dock icon if it shows
        if (process.platform === 'darwin') {
            electron_1.app.setActivationPolicy('accessory');
        }
        electron_1.app.on('second-instance', this.onSecondInstance.bind(this));
        electron_1.app.on('open-file', this.onFileOpened.bind(this));
        electron_1.app.setAppLogsPath();
        process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;
        this.staticServer = new StaticServer_1.default(uiDir);
        void this.appReady();
    }
    get tray() {
        if (!__classPrivateFieldGet(this, _Menubar_tray, "f"))
            throw new Error('Please access `this.tray` after the `ready` event has fired.');
        return __classPrivateFieldGet(this, _Menubar_tray, "f");
    }
    bindSignals() {
        let didRun = false;
        const exit = () => {
            if (didRun)
                return;
            didRun = true;
            return this.appExit();
        };
        process.once('beforeExit', exit);
        process.once('exit', exit);
        process.once('SIGTERM', exit);
        process.once('SIGINT', exit);
        process.once('SIGQUIT', exit);
    }
    hideMenu() {
        if (__classPrivateFieldGet(this, _Menubar_blurTimeout, "f")) {
            clearTimeout(__classPrivateFieldGet(this, _Menubar_blurTimeout, "f"));
            __classPrivateFieldSet(this, _Menubar_blurTimeout, null, "f");
        }
        try {
            if (!__classPrivateFieldGet(this, _Menubar_menuWindow, "f")?.isDestroyed()) {
                __classPrivateFieldGet(this, _Menubar_menuWindow, "f")?.hide();
            }
        }
        catch (error) {
            if (!String(error).includes('Object has been destroyed'))
                throw error;
        }
        __classPrivateFieldGet(this, _Menubar_nsEventMonitor, "f")?.stop();
        __classPrivateFieldGet(this, _Menubar_winMouseEvents, "f")?.pauseMouseEvents();
    }
    onSecondInstance(_, argv) {
        const argonFile = argv.find(x => x.endsWith('.arg'));
        if (argonFile) {
            this.handleArgonFile(argonFile);
        }
    }
    handleArgonFile(path) {
        if (!path.endsWith('.arg'))
            return;
        if (__classPrivateFieldGet(this, _Menubar_apiManager, "f")) {
            void __classPrivateFieldGet(this, _Menubar_apiManager, "f").onArgonFileOpened(path);
        }
        else {
            __classPrivateFieldSet(this, _Menubar_argonFileOpen, path, "f");
        }
    }
    onFileOpened(e, path) {
        if (!path.endsWith('.arg'))
            return;
        e.preventDefault();
        this.handleArgonFile(path);
    }
    async showMenu(trayPos) {
        if (!__classPrivateFieldGet(this, _Menubar_tray, "f")) {
            throw new Error('Tray should have been instantiated by now');
        }
        if (!__classPrivateFieldGet(this, _Menubar_menuWindow, "f")) {
            await this.createWindow();
        }
        // Use guard for TypeScript, to avoid ! everywhere
        if (!__classPrivateFieldGet(this, _Menubar_menuWindow, "f")) {
            throw new Error('Window has been initialized just above. qed.');
        }
        trayPositioner_1.default.alignTrayMenu(__classPrivateFieldGet(this, _Menubar_menuWindow, "f"), trayPos);
        __classPrivateFieldGet(this, _Menubar_menuWindow, "f").show();
        this.listenForMouseDown();
    }
    async beforeQuit() {
        if (__classPrivateFieldGet(this, _Menubar_isClosing, "f"))
            return;
        __classPrivateFieldSet(this, _Menubar_isClosing, true, "f");
        console.warn('Quitting Ulixee Menubar');
        __classPrivateFieldGet(this, _Menubar_tray, "f")?.removeAllListeners();
        this.hideMenu();
        await __classPrivateFieldGet(this, _Menubar_apiManager, "f")?.close();
        __classPrivateFieldGet(this, _Menubar_windowManager, "f").close();
        if (__classPrivateFieldGet(this, _Menubar_installUpdateOnExit, "f")) {
            await __classPrivateFieldGet(this, _Menubar_updateInfoPromise, "f");
            await electron_updater_1.autoUpdater.quitAndInstall(false, true);
        }
    }
    async appExit() {
        await this.beforeQuit();
        electron_1.app.exit();
    }
    async appReady() {
        try {
            await electron_1.app.whenReady();
            // for now auto-start
            await this.staticServer.load();
            __classPrivateFieldSet(this, _Menubar_apiManager, new ApiManager_1.default(), "f");
            __classPrivateFieldSet(this, _Menubar_windowManager, new WindowManager_1.WindowManager(this, __classPrivateFieldGet(this, _Menubar_apiManager, "f")), "f");
            await __classPrivateFieldGet(this, _Menubar_apiManager, "f").start();
            this.bindSignals();
            if (__classPrivateFieldGet(this, _Menubar_argonFileOpen, "f")) {
                await __classPrivateFieldGet(this, _Menubar_apiManager, "f").onArgonFileOpened(__classPrivateFieldGet(this, _Menubar_argonFileOpen, "f"));
                __classPrivateFieldSet(this, _Menubar_argonFileOpen, null, "f");
            }
            await this.updateLocalCloudStatus();
            await this.createWindow();
            __classPrivateFieldSet(this, _Menubar_tray, new electron_1.Tray(iconPath), "f");
            electron_1.app.on('activate', () => {
                if (!__classPrivateFieldGet(this, _Menubar_windowManager, "f").desktopWindow.isOpen) {
                    __classPrivateFieldGet(this, _Menubar_windowManager, "f").desktopWindow.focus();
                }
            });
            __classPrivateFieldGet(this, _Menubar_tray, "f").on('click', this.clicked.bind(this));
            __classPrivateFieldGet(this, _Menubar_tray, "f").on('right-click', this.rightClicked.bind(this));
            __classPrivateFieldGet(this, _Menubar_tray, "f").on('drop-files', this.onDropFiles.bind(this));
            __classPrivateFieldGet(this, _Menubar_tray, "f").setToolTip(__classPrivateFieldGet(this, _Menubar_options, "f").tooltip || '');
            electron_1.app.dock?.hide();
            this.emit('ready');
            this.initUpdater();
            await (0, installDefaultChrome_1.default)();
        }
        catch (error) {
            console.error('ERROR in appReady: ', error);
            await this.appExit();
        }
    }
    listenForMouseDown() {
        if (process.platform === 'darwin') {
            // eslint-disable-next-line import/no-unresolved,global-require
            const { NSEventMonitor, NSEventMask } = require('nseventmonitor');
            __classPrivateFieldSet(this, _Menubar_nsEventMonitor, __classPrivateFieldGet(this, _Menubar_nsEventMonitor, "f") ?? new NSEventMonitor(), "f");
            __classPrivateFieldGet(this, _Menubar_nsEventMonitor, "f").start(NSEventMask.leftMouseDown | NSEventMask.rightMouseDown, this.hideMenu.bind(this));
        }
        else if (process.platform === 'win32') {
            if (__classPrivateFieldGet(this, _Menubar_winMouseEvents, "f")) {
                __classPrivateFieldGet(this, _Menubar_winMouseEvents, "f").resumeMouseEvents();
                return;
            }
            // eslint-disable-next-line import/no-unresolved,global-require
            const mouseEvents = require('global-mouse-events');
            __classPrivateFieldSet(this, _Menubar_winMouseEvents, mouseEvents, "f");
            mouseEvents.on('mousedown', event => {
                const { x, y } = event;
                const bounds = __classPrivateFieldGet(this, _Menubar_menuWindow, "f").getBounds();
                const isOutsideX = x < bounds.x || x > bounds.x + bounds.width;
                const isOutsideY = y < bounds.y || y > bounds.y + bounds.height;
                if (!isOutsideX && !isOutsideY)
                    return;
                if (event.button === 1 || event.button === 2)
                    this.hideMenu();
            });
        }
    }
    initUpdater() {
        try {
            electron_updater_1.autoUpdater.logger = null;
            electron_updater_1.autoUpdater.autoDownload = true;
            electron_updater_1.autoUpdater.autoInstallOnAppQuit = false;
            electron_updater_1.autoUpdater.allowDowngrade = true;
            electron_updater_1.autoUpdater.allowPrerelease = version.includes('alpha');
            electron_updater_1.autoUpdater.on('update-not-available', this.noUpdateAvailable.bind(this));
            electron_updater_1.autoUpdater.on('update-available', this.onUpdateAvailable.bind(this));
            electron_updater_1.autoUpdater.signals.progress(this.onDownloadProgress.bind(this));
        }
        catch (error) {
            electron_log_1.default.error('Error initializing AutoUpdater', { error });
        }
    }
    async noUpdateAvailable() {
        electron_log_1.default.verbose('No new Ulixee.app versions available');
        await this.sendToFrontend('Version.onLatest', {});
    }
    async onUpdateAvailable(update) {
        electron_log_1.default.info('New Ulixee.app version available', update);
        __classPrivateFieldSet(this, _Menubar_updateInfoPromise, Promise.resolve(update), "f");
        await this.sendToFrontend('Version.available', {
            version: update.version,
        });
    }
    async onDownloadProgress(progress) {
        electron_log_1.default.verbose('New version download progress', progress);
        __classPrivateFieldSet(this, _Menubar_downloadProgress, Math.round(progress.percent), "f");
        await this.sendToFrontend('Version.download', {
            progress: __classPrivateFieldGet(this, _Menubar_downloadProgress, "f"),
        });
    }
    async versionCheck() {
        if (await __classPrivateFieldGet(this, _Menubar_updateInfoPromise, "f"))
            return;
        if (electron_updater_1.autoUpdater.isUpdaterActive())
            return;
        try {
            electron_log_1.default.verbose('Checking for version update');
            __classPrivateFieldSet(this, _Menubar_updateInfoPromise, electron_updater_1.autoUpdater.checkForUpdates().then(x => x.updateInfo), "f");
            await __classPrivateFieldGet(this, _Menubar_updateInfoPromise, "f");
        }
        catch (error) {
            electron_log_1.default.error('ERROR checking for new version', error);
        }
    }
    async versionInstall() {
        electron_log_1.default.verbose('Installing version', {
            progress: __classPrivateFieldGet(this, _Menubar_downloadProgress, "f"),
            update: await __classPrivateFieldGet(this, _Menubar_updateInfoPromise, "f"),
        });
        __classPrivateFieldSet(this, _Menubar_installUpdateOnExit, true, "f");
        await this.sendToFrontend('Version.installing', {});
        if (__classPrivateFieldGet(this, _Menubar_downloadProgress, "f") < 100)
            await electron_updater_1.autoUpdater.downloadUpdate();
        await electron_updater_1.autoUpdater.quitAndInstall(false, true);
    }
    async clicked() {
        if (__classPrivateFieldGet(this, _Menubar_menuWindow, "f")?.isVisible()) {
            this.hideMenu();
        }
        await __classPrivateFieldGet(this, _Menubar_windowManager, "f").openDesktop();
        await this.checkForUpdates();
    }
    async rightClicked(event, bounds) {
        if (event && (event.shiftKey || event.ctrlKey || event.metaKey)) {
            return this.hideMenu();
        }
        // if blur was invoked clear timeout
        if (__classPrivateFieldGet(this, _Menubar_blurTimeout, "f")) {
            clearInterval(__classPrivateFieldGet(this, _Menubar_blurTimeout, "f"));
            __classPrivateFieldSet(this, _Menubar_blurTimeout, null, "f");
        }
        if (__classPrivateFieldGet(this, _Menubar_menuWindow, "f")?.isVisible()) {
            return this.hideMenu();
        }
        await this.showMenu(bounds);
        await this.checkForUpdates();
    }
    onDropFiles(_, files) {
        for (const file of files) {
            if (file.endsWith('.arg'))
                this.handleArgonFile(file);
        }
    }
    async checkForUpdates() {
        try {
            if (!__classPrivateFieldGet(this, _Menubar_updateInfoPromise, "f")) {
                __classPrivateFieldSet(this, _Menubar_updateInfoPromise, electron_updater_1.autoUpdater
                    .checkForUpdatesAndNotify()
                    .then(x => x?.updateInfo ?? null), "f");
                await __classPrivateFieldGet(this, _Menubar_updateInfoPromise, "f");
            }
        }
        catch (error) {
            electron_log_1.default.error('ERROR checking for new version', error);
        }
    }
    async createWindow() {
        const defaults = {
            show: false,
            frame: false,
            width: __classPrivateFieldGet(this, _Menubar_options, "f").width,
            height: __classPrivateFieldGet(this, _Menubar_options, "f").height,
        };
        __classPrivateFieldSet(this, _Menubar_menuWindow, new electron_1.BrowserWindow({
            ...defaults,
            roundedCorners: true,
            skipTaskbar: true,
            autoHideMenuBar: true,
            transparent: false,
            alwaysOnTop: true,
            useContentSize: true,
            webPreferences: {
                javascript: true,
                preload: `${__dirname}/MenubarPagePreload.js`,
            },
        }), "f");
        __classPrivateFieldGet(this, _Menubar_menuWindow, "f").on('blur', () => {
            if (!__classPrivateFieldGet(this, _Menubar_menuWindow, "f") || __classPrivateFieldGet(this, _Menubar_isClosing, "f")) {
                return;
            }
            __classPrivateFieldSet(this, _Menubar_blurTimeout, setTimeout(() => this.hideMenu(), 100), "f");
        });
        __classPrivateFieldGet(this, _Menubar_menuWindow, "f").on('focus', () => {
            clearTimeout(__classPrivateFieldGet(this, _Menubar_blurTimeout, "f"));
            __classPrivateFieldSet(this, _Menubar_blurTimeout, null, "f");
        });
        __classPrivateFieldGet(this, _Menubar_menuWindow, "f").setVisibleOnAllWorkspaces(true);
        __classPrivateFieldGet(this, _Menubar_menuWindow, "f").on('close', this.windowClear.bind(this));
        __classPrivateFieldGet(this, _Menubar_menuWindow, "f").webContents.on('ipc-message', async (e, message, ...args) => {
            if (message === 'desktop:api') {
                const [api] = args;
                if (api === 'mousedown') {
                    this.hideMenu();
                }
                if (api === 'App.quit') {
                    await this.appExit();
                }
                if (api === 'App.openLogsDirectory') {
                    await electron_1.shell.openPath(Path.dirname(electron_log_1.default.transports.file.getFile().path));
                }
                if (api === 'App.openDataDirectory') {
                    await electron_1.shell.openPath(__classPrivateFieldGet(this, _Menubar_apiManager, "f").localCloud.datastoreCore.options.datastoresDir);
                }
                if (api === 'App.openHeroSession') {
                    await __classPrivateFieldGet(this, _Menubar_windowManager, "f").pickHeroSession();
                }
                if (api === 'App.openDesktop') {
                    await __classPrivateFieldGet(this, _Menubar_windowManager, "f").openDesktop();
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
        const windowBackground = electron_1.systemPreferences.getColor(backgroundPref)?.replace('#', '') ?? '';
        const url = this.staticServer.getPath(`menubar.html?windowBackground=${windowBackground}`);
        await __classPrivateFieldGet(this, _Menubar_menuWindow, "f").loadURL(url);
        if (process.env.OPEN_DEVTOOLS) {
            __classPrivateFieldGet(this, _Menubar_menuWindow, "f").webContents.openDevTools({ mode: 'detach' });
        }
        if (__classPrivateFieldGet(this, _Menubar_apiManager, "f").localCloud) {
            await this.updateLocalCloudStatus();
        }
    }
    windowClear() {
        __classPrivateFieldSet(this, _Menubar_menuWindow, undefined, "f");
    }
    /// //// CLOUD MANAGEMENT ////////////////////////////////////////////////////////////////////////////////////////////
    async stopCloud() {
        if (!__classPrivateFieldGet(this, _Menubar_apiManager, "f")?.localCloud)
            return;
        // eslint-disable-next-line no-console
        console.log(`CLOSING ULIXEE CLOUD`);
        await __classPrivateFieldGet(this, _Menubar_apiManager, "f").stopLocalCloud();
        await this.updateLocalCloudStatus();
    }
    async startCloud() {
        await __classPrivateFieldGet(this, _Menubar_apiManager, "f").startLocalCloud();
        // eslint-disable-next-line no-console
        console.log(`STARTED ULIXEE CLOUD at ${await __classPrivateFieldGet(this, _Menubar_apiManager, "f").localCloud.address}`);
        await this.updateLocalCloudStatus();
    }
    async updateLocalCloudStatus() {
        if (__classPrivateFieldGet(this, _Menubar_isClosing, "f"))
            return;
        let address = null;
        if (__classPrivateFieldGet(this, _Menubar_apiManager, "f").localCloud) {
            address = await __classPrivateFieldGet(this, _Menubar_apiManager, "f").localCloud.address;
        }
        await this.sendToFrontend('Cloud.status', {
            started: !!__classPrivateFieldGet(this, _Menubar_apiManager, "f").localCloud,
            address,
        });
    }
    async sendToFrontend(eventType, data) {
        if (__classPrivateFieldGet(this, _Menubar_menuWindow, "f")) {
            const json = { detail: { eventType, data } };
            await __classPrivateFieldGet(this, _Menubar_menuWindow, "f").webContents.executeJavaScript(`(()=>{
      const evt = ${JSON.stringify(json)};
      document.dispatchEvent(new CustomEvent('desktop:event', evt));
    })()`);
        }
    }
}
exports.Menubar = Menubar;
_Menubar_tray = new WeakMap(), _Menubar_menuWindow = new WeakMap(), _Menubar_blurTimeout = new WeakMap(), _Menubar_nsEventMonitor = new WeakMap(), _Menubar_winMouseEvents = new WeakMap(), _Menubar_windowManager = new WeakMap(), _Menubar_isClosing = new WeakMap(), _Menubar_updateInfoPromise = new WeakMap(), _Menubar_installUpdateOnExit = new WeakMap(), _Menubar_downloadProgress = new WeakMap(), _Menubar_apiManager = new WeakMap(), _Menubar_argonFileOpen = new WeakMap(), _Menubar_options = new WeakMap();
//# sourceMappingURL=Menubar.js.map