"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformBuild = exports.execAndLog = void 0;
const node_child_process_1 = require("node:child_process");
const Path = require("node:path");
function execAndLog(command, options) {
    options ??= {};
    options.encoding ??= 'utf8';
    const result = (0, node_child_process_1.execSync)(command, options);
    console.log(`$ ${command}\n\n`, result);
    return result;
}
exports.execAndLog = execAndLog;
function getPlatformBuild() {
    let root = __dirname;
    while (!root.endsWith(`${Path.sep}platform`)) {
        root = Path.dirname(root);
        if (root === '/')
            throw new Error('Root project not found');
    }
    return Path.join(root, 'build');
}
exports.getPlatformBuild = getPlatformBuild;
//# sourceMappingURL=utils.js.map