"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@ulixee/commons/lib/SourceMapSupport");
const Path = require("path");
const datastoreDev_1 = require("./datastoreDev");
const dataUser_1 = require("./dataUser");
async function main() {
    const needsClosing = [];
    let root = __dirname;
    while (!root.endsWith('/ulixee')) {
        root = Path.dirname(root);
        if (root === '/')
            throw new Error('Root project not found');
    }
    const buildDir = Path.join(root, 'build');
    try {
        const result = await (0, datastoreDev_1.default)(needsClosing, buildDir);
        await (0, dataUser_1.default)(result, buildDir);
        console.log('Completed!');
    }
    catch (error) {
        console.error(error);
    }
    for (const closer of needsClosing) {
        await closer();
    }
    process.exit();
}
main().catch(console.error);
//# sourceMappingURL=index.js.map