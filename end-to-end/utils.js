"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execAndLog = exports.getCloudAddress = void 0;
const child_process_1 = require("child_process");
function getCloudAddress(cloudNodeProcess) {
    return new Promise(resolve => {
        cloudNodeProcess.stderr.setEncoding('utf8');
        cloudNodeProcess.stderr.on('data', console.error);
        cloudNodeProcess.stdout.setEncoding('utf8');
        cloudNodeProcess.stdout.on('data', (message) => {
            console.log('[DATASTORE CORE]', message.trim());
            const match = message.match(/Ulixee Cloud listening at (.+)/);
            if (match?.length)
                resolve(match[1]);
        });
    });
}
exports.getCloudAddress = getCloudAddress;
function execAndLog(command, options) {
    console.log(`--------\n\n\n${command}\n\n\n-------`);
    options ??= {};
    options.encoding ??= 'utf8';
    return (0, child_process_1.execSync)(command, options);
}
exports.execAndLog = execAndLog;
//# sourceMappingURL=utils.js.map