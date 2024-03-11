"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const Path = require("path");
const assert = require("assert");
const utils_1 = require("../utils");
async function main(needsClosing, rootDir) {
    // CREATE IDENTITIES
    const identityPath = Path.resolve(`${__dirname}/identities/DatastoreDev.json`);
    (0, utils_1.execAndLog)(`npx @ulixee/crypto identity --filename="${identityPath}"`, {
        stdio: 'inherit',
    });
    const identityBech32 = (0, utils_1.execAndLog)(`npx @ulixee/crypto read-identity --filename="${identityPath}"`);
    assert(identityBech32, 'Must be a valid identity');
    // BOOT UP A CLOUD WITH GIFT CARD RESTRICTIONS
    const cloudNode = (0, child_process_1.spawn)(`npx @ulixee/cloud start`, {
        stdio: 'pipe',
        cwd: rootDir,
        shell: true,
        env: {
            ...process.env,
            ULX_CLOUD_ADMIN_IDENTITIES: identityBech32,
            ULX_IDENTITY_PATH: identityPath,
            ULX_DISABLE_CHROMEALIVE: 'true',
        },
    });
    const cloudAddress = await (0, utils_1.getCloudAddress)(cloudNode);
    needsClosing.push(() => cloudNode.kill());
    // For some reason, nodejs is taking CWD, but then going to closest package.json, so have to prefix with ./credits
    (0, utils_1.execAndLog)(`npx @ulixee/datastore deploy -h ${cloudAddress} ./credits/datastore/index.js`, {
        cwd: __dirname,
        env: {
            ...process.env,
            ULX_IDENTITY_PATH: identityPath,
        },
    });
    const datastoreId = 'end-to-end';
    const datastoreVersion = '0.0.1';
    const creditResult = (0, utils_1.execAndLog)(`npx @ulixee/datastore credits create --argons=5 ${cloudAddress}/${datastoreId}@v${datastoreVersion}`, {
        cwd: __dirname,
        env: {
            ...process.env,
            ULX_IDENTITY_PATH: identityPath,
        },
    });
    const creditUrl = creditResult.split('\n\n').filter(Boolean).pop().trim();
    console.log('Store Credit URL:', creditUrl);
    return {
        creditUrl,
        datastoreId,
        datastoreVersion,
        cloudAddress,
    };
}
exports.default = main;
//# sourceMappingURL=datastoreDev.js.map