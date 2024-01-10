"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _WindowManager_chromeAliveWindowsBySessionId;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowManager = void 0;
const electron_1 = require("electron");
const Path = require("path");
const EventSubscriber_1 = require("@ulixee/commons/lib/EventSubscriber");
const Os = require("os");
const ChromeAliveWindow_1 = require("./ChromeAliveWindow");
const DesktopWindow_1 = require("./DesktopWindow");
const generateAppMenu_1 = require("../menus/generateAppMenu");
class WindowManager {
    constructor(menuBar, apiManager) {
        this.menuBar = menuBar;
        this.apiManager = apiManager;
        this.chromeAliveWindows = [];
        this.activeChromeAliveWindowIdx = 0;
        this.events = new EventSubscriber_1.default();
        _WindowManager_chromeAliveWindowsBySessionId.set(this, new Map());
        this.events.on(apiManager, 'new-cloud-address', this.onNewCloudAddress.bind(this));
        this.events.on(apiManager, 'api-event', this.onApiEvent.bind(this));
        this.events.on(apiManager, 'argon-file-opened', this.onArgonFileOpened.bind(this));
        this.bindIpcEvents();
        this.desktopWindow = new DesktopWindow_1.default(menuBar.staticServer, apiManager);
        this.events.on(this.desktopWindow, 'close', this.checkOpenWindows.bind(this));
        this.events.on(this.desktopWindow, 'focus', this.setMenu.bind(this));
        this.events.on(apiManager.privateDesktopApiHandler, 'open-replay', this.loadChromeAliveWindow.bind(this));
    }
    get activeChromeAliveWindow() {
        return this.chromeAliveWindows[this.activeChromeAliveWindowIdx];
    }
    async openDesktop() {
        await electron_1.app.dock?.show();
        this.setMenu();
        await this.desktopWindow.open();
    }
    close() {
        this.events.close();
    }
    async loadChromeAliveWindow(data) {
        if (__classPrivateFieldGet(this, _WindowManager_chromeAliveWindowsBySessionId, "f").has(data.heroSessionId)) {
            __classPrivateFieldGet(this, _WindowManager_chromeAliveWindowsBySessionId, "f").get(data.heroSessionId).window.focus();
            return;
        }
        await electron_1.app.dock?.show();
        const chromeAliveWindow = new ChromeAliveWindow_1.default(data, this.menuBar.staticServer, data.cloudAddress);
        const { heroSessionId } = data;
        this.chromeAliveWindows.push(chromeAliveWindow);
        __classPrivateFieldGet(this, _WindowManager_chromeAliveWindowsBySessionId, "f").set(heroSessionId, chromeAliveWindow);
        await chromeAliveWindow
            .load()
            .catch(err => console.error('Error Loading ChromeAlive window', err));
        const focusEvent = this.events.on(chromeAliveWindow.window, 'focus', this.focusWindow.bind(this, heroSessionId));
        this.events.once(chromeAliveWindow.window, 'close', this.closeWindow.bind(this, heroSessionId, focusEvent));
        this.setMenu();
    }
    async pickHeroSession() {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openFile', 'showHiddenFiles'],
            defaultPath: Path.join(Os.tmpdir(), '.ulixee', 'hero-sessions'),
            filters: [
                // { name: 'All Files', extensions: ['js', 'ts', 'db'] },
                { name: 'Session Database', extensions: ['db'] },
                // { name: 'Javascript', extensions: ['js'] },
                // { name: 'Typescript', extensions: ['ts'] },
            ],
        });
        if (result.filePaths.length) {
            const [filename] = result.filePaths;
            if (filename.endsWith('.db')) {
                return this.loadChromeAliveWindow({
                    cloudAddress: this.apiManager.localCloudAddress,
                    dbPath: filename,
                    heroSessionId: Path.basename(filename).replace('.db', ''),
                });
            }
            // const sessionContainerDir = Path.dirname(filename);
            // TODO: show relevant sessions
        }
    }
    async onArgonFileOpened(file) {
        await this.openDesktop();
        await this.apiManager.privateDesktopApiHandler.onArgonFileOpened(file);
    }
    setMenu() {
        if (this.desktopWindow.isFocused) {
            electron_1.Menu.setApplicationMenu((0, generateAppMenu_1.default)(null));
        }
        else {
            electron_1.Menu.setApplicationMenu((0, generateAppMenu_1.default)(this.activeChromeAliveWindow));
        }
    }
    onApiEvent(event) {
        if (event.eventType === 'Session.opened') {
            void this.loadChromeAliveWindow({
                ...event.data,
                cloudAddress: event.cloudAddress,
            });
        }
    }
    async onNewCloudAddress(event) {
        const { oldAddress, address } = event;
        if (!oldAddress)
            return;
        for (const window of this.chromeAliveWindows) {
            if (window.api.address.startsWith(oldAddress)) {
                await window.reconnect(address);
            }
        }
    }
    bindIpcEvents() {
        electron_1.ipcMain.on('open-file', this.pickHeroSession.bind(this));
    }
    closeWindow(heroSessionId, ...eventsToUnregister) {
        const chromeAliveWindow = __classPrivateFieldGet(this, _WindowManager_chromeAliveWindowsBySessionId, "f").get(heroSessionId);
        if (!chromeAliveWindow)
            return;
        __classPrivateFieldGet(this, _WindowManager_chromeAliveWindowsBySessionId, "f").delete(heroSessionId);
        this.events.off(...eventsToUnregister);
        const idx = this.chromeAliveWindows.indexOf(chromeAliveWindow);
        if (idx === this.activeChromeAliveWindowIdx) {
            this.activeChromeAliveWindowIdx = 0;
        }
        this.chromeAliveWindows.splice(idx, 1);
        this.checkOpenWindows();
        this.setMenu();
    }
    checkOpenWindows() {
        if (this.chromeAliveWindows.length === 0 && !this.desktopWindow.isOpen) {
            electron_1.app.dock?.hide();
        }
    }
    focusWindow(heroSessionId) {
        const chromeAliveWindow = __classPrivateFieldGet(this, _WindowManager_chromeAliveWindowsBySessionId, "f").get(heroSessionId);
        if (chromeAliveWindow)
            this.activeChromeAliveWindowIdx = this.chromeAliveWindows.indexOf(chromeAliveWindow);
        this.setMenu();
    }
}
exports.WindowManager = WindowManager;
_WindowManager_chromeAliveWindowsBySessionId = new WeakMap();
//# sourceMappingURL=WindowManager.js.map