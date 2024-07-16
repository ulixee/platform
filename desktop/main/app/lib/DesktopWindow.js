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
var _DesktopWindow_window, _DesktopWindow_events, _DesktopWindow_webpageUrl, _DesktopWindow_windowStateKeeper;
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const Path = require("path");
const EventSubscriber_1 = require("@ulixee/commons/lib/EventSubscriber");
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
const generateContextMenu_1 = require("../menus/generateContextMenu");
const windowStateKeeper_1 = require("./util/windowStateKeeper");
class DesktopWindow extends eventUtils_1.TypedEventEmitter {
    get isOpen() {
        return __classPrivateFieldGet(this, _DesktopWindow_window, "f")?.isVisible() === true;
    }
    get isFocused() {
        return __classPrivateFieldGet(this, _DesktopWindow_window, "f")?.isFocused();
    }
    get webContents() {
        return __classPrivateFieldGet(this, _DesktopWindow_window, "f")?.webContents;
    }
    constructor(staticServer, apiManager) {
        super();
        this.apiManager = apiManager;
        _DesktopWindow_window.set(this, void 0);
        _DesktopWindow_events.set(this, new EventSubscriber_1.default());
        _DesktopWindow_webpageUrl.set(this, void 0);
        _DesktopWindow_windowStateKeeper.set(this, new windowStateKeeper_1.default('DesktopWindow'));
        __classPrivateFieldSet(this, _DesktopWindow_webpageUrl, staticServer.getPath('desktop.html'), "f");
        void this.open(false);
    }
    focus() {
        __classPrivateFieldGet(this, _DesktopWindow_window, "f").moveTop();
    }
    async open(show = true) {
        if (__classPrivateFieldGet(this, _DesktopWindow_window, "f")) {
            if (show) {
                __classPrivateFieldGet(this, _DesktopWindow_window, "f").setAlwaysOnTop(true);
                __classPrivateFieldGet(this, _DesktopWindow_window, "f").show();
                __classPrivateFieldGet(this, _DesktopWindow_window, "f").setAlwaysOnTop(false);
            }
            return;
        }
        __classPrivateFieldSet(this, _DesktopWindow_window, new electron_1.BrowserWindow({
            show: false,
            acceptFirstMouse: true,
            useContentSize: true,
            titleBarStyle: 'hiddenInset',
            ...__classPrivateFieldGet(this, _DesktopWindow_windowStateKeeper, "f").windowState,
            webPreferences: {
                preload: `${__dirname}/DesktopPagePreload.js`,
            },
            icon: Path.resolve('..', 'assets', 'icon.png'),
        }), "f");
        __classPrivateFieldGet(this, _DesktopWindow_windowStateKeeper, "f").track(__classPrivateFieldGet(this, _DesktopWindow_window, "f"));
        __classPrivateFieldGet(this, _DesktopWindow_window, "f").setTitle('Ulixee Desktop');
        __classPrivateFieldGet(this, _DesktopWindow_window, "f").webContents.ipc.handle('desktop:api', async (e, { api, args }) => {
            if (api === 'Argon.dragAsFile') {
                return await this.apiManager.privateDesktopApiHandler.dragArgonsAsFile(args, e.sender);
            }
        });
        __classPrivateFieldGet(this, _DesktopWindow_window, "f").webContents.ipc.on('getPrivateApiHost', e => {
            e.returnValue = this.apiManager.privateDesktopWsServerAddress;
        });
        __classPrivateFieldGet(this, _DesktopWindow_window, "f").webContents.setWindowOpenHandler(details => {
            void electron_1.shell.openExternal(details.url);
            return { action: 'deny' };
        });
        __classPrivateFieldGet(this, _DesktopWindow_events, "f").on(__classPrivateFieldGet(this, _DesktopWindow_window, "f").webContents, 'context-menu', (e, params) => {
            (0, generateContextMenu_1.default)(params, __classPrivateFieldGet(this, _DesktopWindow_window, "f").webContents).popup();
        });
        __classPrivateFieldGet(this, _DesktopWindow_events, "f").on(__classPrivateFieldGet(this, _DesktopWindow_window, "f"), 'focus', this.emit.bind(this, 'focus'));
        __classPrivateFieldGet(this, _DesktopWindow_events, "f").on(__classPrivateFieldGet(this, _DesktopWindow_window, "f"), 'close', this.close.bind(this));
        await __classPrivateFieldGet(this, _DesktopWindow_window, "f").webContents.loadURL(__classPrivateFieldGet(this, _DesktopWindow_webpageUrl, "f"));
        if (show) {
            __classPrivateFieldGet(this, _DesktopWindow_window, "f").show();
            __classPrivateFieldGet(this, _DesktopWindow_window, "f").moveTop();
        }
    }
    close(e, force = false) {
        if (force) {
            __classPrivateFieldGet(this, _DesktopWindow_events, "f").close();
            __classPrivateFieldSet(this, _DesktopWindow_window, null, "f");
        }
        else {
            __classPrivateFieldGet(this, _DesktopWindow_window, "f").hide();
            e.preventDefault();
        }
        this.emit('close');
    }
}
_DesktopWindow_window = new WeakMap(), _DesktopWindow_events = new WeakMap(), _DesktopWindow_webpageUrl = new WeakMap(), _DesktopWindow_windowStateKeeper = new WeakMap();
exports.default = DesktopWindow;
//# sourceMappingURL=DesktopWindow.js.map