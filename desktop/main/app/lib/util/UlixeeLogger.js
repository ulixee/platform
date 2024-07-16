"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = require("electron-log");
const Logger_1 = require("@ulixee/commons/lib/Logger");
const electron_1 = require("electron");
const Path = require("path");
Object.assign(console, electron_log_1.default.functions);
class UlixeeLogger extends Logger_1.Log {
    constructor(module, boundContext) {
        super(module, boundContext);
        this.useColors = !electron_1.app.isPackaged;
    }
    logToConsole(level, entry) {
        const printablePath = entry.module
            .replace('.js', '')
            .replace('.ts', '')
            .replace(`build${Path.sep}`, '')
            .replace(`desktop${Path.sep}packages`, '');
        const { error, printData } = (0, Logger_1.translateToPrintable)(entry.data);
        if (level === 'warn' || level === 'error') {
            printData.sessionId = entry.sessionId;
            printData.sessionName = Logger_1.loggerSessionIdNames.get(entry.sessionId) ?? undefined;
        }
        const params = Object.keys(printData).length ? [printData] : [];
        if (error)
            params.push(error);
        const args = [`[${printablePath}] ${entry.action}`, ...params];
        if (level === 'stats') {
            electron_log_1.default.debug(...args);
        }
        else {
            electron_log_1.default[level](...args);
        }
    }
    static register() {
        (0, Logger_1.injectLogger)(module => {
            return { log: new UlixeeLogger(module) };
        });
    }
}
exports.default = UlixeeLogger;
//# sourceMappingURL=UlixeeLogger.js.map