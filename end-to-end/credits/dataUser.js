"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CreditsStore_1 = require("@ulixee/datastore/lib/CreditsStore");
const DatastoreApiClient_1 = require("@ulixee/datastore/lib/DatastoreApiClient");
const utils_1 = require("../utils");
async function main(datastore, rootDir) {
    const { datastoreId, datastoreVersion, creditUrl, cloudAddress } = datastore;
    (0, utils_1.execAndLog)(`npx @ulixee/datastore credits install ${creditUrl}`, {
        cwd: rootDir,
        stdio: 'inherit',
    });
    const datastoreClient = new DatastoreApiClient_1.default(cloudAddress);
    const pricing = await datastoreClient.getExtractorPricing(datastoreId, datastoreVersion, 'default');
    const payment = await CreditsStore_1.default.getPayment(datastoreId, datastoreVersion, pricing.minimumPrice);
    const result = await datastoreClient.query(datastoreId, datastoreVersion, 'SELECT * FROM default(test => $1)', {
        boundValues: [1],
        payment,
    });
    console.log('Result of datastore query is:', result);
    (0, utils_1.execAndLog)(`npx @ulixee/datastore credits get ${creditUrl}`, {
        cwd: rootDir,
        stdio: 'inherit',
    });
}
exports.default = main;
//# sourceMappingURL=dataUser.js.map