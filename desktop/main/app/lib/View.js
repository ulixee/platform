"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const generateContextMenu_1 = require("../menus/generateContextMenu");
class View {
    get webContents() {
        return this.browserView.webContents;
    }
    constructor(window, webPreferences = {}) {
        this.isAttached = false;
        this.window = window;
        this.browserView = new electron_1.BrowserView({
            webPreferences: {
                sandbox: false,
                contextIsolation: false,
                ...webPreferences,
            },
        });
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
    bringToFront() {
        this.attach();
        this.window.setTopBrowserView(this.browserView);
    }
    detach() {
        if (this.browserView)
            this.window.removeBrowserView(this.browserView);
        this.isAttached = false;
    }
    destroy() {
        this.detach();
        this.browserView = null;
    }
    hide() {
        const { x, y } = this.bounds ?? { x: 0, y: 0 };
        this.setBounds({ x, y, width: 0, height: 0 });
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
//# sourceMappingURL=View.js.map