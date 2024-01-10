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
var _View_browserView;
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const generateContextMenu_1 = require("../menus/generateContextMenu");
class View {
    constructor(window, webPreferences = {}) {
        this.isAttached = false;
        _View_browserView.set(this, void 0);
        this.window = window;
        this.browserView = new electron_1.BrowserView({
            webPreferences: {
                sandbox: false,
                contextIsolation: false,
                ...webPreferences,
            },
        });
    }
    get webContents() {
        return this.browserView.webContents;
    }
    addContextMenu() {
        this.webContents.on('context-menu', (e, params) => {
            (0, generateContextMenu_1.default)(params, this.webContents).popup();
        });
    }
    attach() {
        if (!this.isAttached) {
            this.window.addBrowserView(this.browserView);
            this.isAttached = true;
        }
    }
    detach() {
        if (__classPrivateFieldGet(this, _View_browserView, "f"))
            this.window.removeBrowserView(__classPrivateFieldGet(this, _View_browserView, "f"));
        this.isAttached = false;
    }
    destroy() {
        this.detach();
        __classPrivateFieldSet(this, _View_browserView, null, "f");
    }
    hide() {
        this.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    }
    async getContentsHeight() {
        return await this.webContents.executeJavaScript(`document.querySelector('body > #app').offsetHeight`);
    }
    setBounds(newBounds) {
        if (this.bounds &&
            this.bounds.x === newBounds.x &&
            this.bounds.y === newBounds.y &&
            this.bounds.width === newBounds.width &&
            this.bounds.height === newBounds.height) {
            return;
        }
        this.browserView.setBounds(newBounds);
        this.bounds = newBounds;
        this.isHidden = newBounds.width === 0 && newBounds.height === 0;
    }
    static async getTargetInfo(wc) {
        await wc.debugger.attach();
        const { targetInfo } = await wc.debugger.sendCommand('Target.getTargetInfo');
        await wc.debugger.detach();
        return targetInfo;
    }
}
exports.default = View;
_View_browserView = new WeakMap();
//# sourceMappingURL=View.js.map