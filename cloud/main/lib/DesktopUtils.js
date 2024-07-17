"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("../env");
class DesktopUtils {
    static isInstalled() {
        try {
            if (env_1.default.disableChromeAlive)
                return false;
            this.getDesktop();
            return true;
        }
        catch (err) {
            return false;
        }
    }
    static getDesktop() {
        // eslint-disable-next-line global-require
        return require('@ulixee/desktop-core').default;
    }
}
exports.default = DesktopUtils;
//# sourceMappingURL=DesktopUtils.js.map