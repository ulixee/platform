"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notarize_1 = require("@electron/notarize");
async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context;
    if (electronPlatformName !== 'darwin' ||
        process.env.SKIP_NOTARIZE ||
        process.env.CSC_IDENTITY_AUTO_DISCOVERY === 'false') {
        return;
    }
    const appName = context.packager.appInfo.productFilename;
    return await (0, notarize_1.notarize)({
        tool: 'notarytool',
        appPath: `${appOutDir}/${appName}.app`,
        appleApiKey: '~/.private_keys/AuthKey_5VH6PQ3585.p8',
        appleApiKeyId: '5VH6PQ3585',
        appleApiIssuer: 'a89474ed-637f-4cf0-8429-da45ef388882',
        // teamId: 'DY8K483XWV',
    });
}
exports.default = notarizing;
//# sourceMappingURL=notarize.js.map