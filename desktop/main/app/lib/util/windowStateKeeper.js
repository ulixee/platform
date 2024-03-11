"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const Path = require("path");
const Fs = require("fs");
const EventSubscriber_1 = require("@ulixee/commons/lib/EventSubscriber");
class WindowStateKeeper {
    constructor(windowName) {
        this.windowName = windowName;
        this.windowState = {
            x: undefined,
            y: undefined,
            width: 1400,
            height: 800,
            isMaximized: false,
        };
        this.events = new EventSubscriber_1.default();
        this.configPath = Path.join(electron_1.app.getPath('userData'), `${windowName}.json`);
        if (Fs.existsSync(this.configPath)) {
            try {
                this.windowState = JSON.parse(Fs.readFileSync(this.configPath, 'utf8'));
            }
            catch { }
        }
    }
    track(window) {
        this.events.on(window, 'resize', this.save.bind(this, window));
        this.events.on(window, 'move', this.save.bind(this, window));
        this.events.once(window, 'close', this.save.bind(this, window));
        this.events.once(window, 'close', () => this.events.close());
    }
    save(window) {
        if (!this.windowState.isMaximized) {
            this.windowState = window.getBounds();
        }
        this.windowState.isMaximized = window.isMaximized();
        Fs.writeFileSync(this.configPath, JSON.stringify(this.windowState));
    }
}
exports.default = WindowStateKeeper;
//# sourceMappingURL=windowStateKeeper.js.map