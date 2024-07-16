"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const default_browser_emulator_1 = require("@ulixee/default-browser-emulator");
let hasUnpackedChrome = false;
async function installDefaultChrome() {
    if (hasUnpackedChrome)
        return;
    try {
        // eslint-disable-next-line global-require,import/no-dynamic-require
        let LatestChrome = require(`@ulixee/${default_browser_emulator_1.defaultBrowserEngine.id}`);
        if (LatestChrome.default)
            LatestChrome = LatestChrome.default;
        const chromeApp = new LatestChrome();
        if (chromeApp.isInstalled) {
            hasUnpackedChrome = true;
            return;
        }
        await chromeApp.install();
        hasUnpackedChrome = true;
    }
    catch (err) {
        console.error('ERROR trying to install latest browser', err);
    }
}
exports.default = installDefaultChrome;
//# sourceMappingURL=installDefaultChrome.js.map