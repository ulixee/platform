"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Core = void 0;
require("@ulixee/commons/lib/SourceMapSupport");
const hero_core_1 = require("@ulixee/hero-core");
exports.Core = hero_core_1.default;
const hero_1 = require("@ulixee/hero");
const cloud_1 = require("@ulixee/cloud");
const hosts_1 = require("@ulixee/commons/config/hosts");
const { version } = require('./package.json');
__exportStar(require("@ulixee/hero"), exports);
let counter = 0;
class Hero extends hero_1.default {
    constructor(createOptions = {}) {
        counter += 1;
        if (counter > 1) {
            console.warn(`You've launched multiple instances of Hero using Hero Playgrounds. @ulixee/hero-playgrounds is intended to help you get started with examples, but will try to automatically shut down after the first example is run. 
      
If you're starting to run real production scenarios, you likely want to look into converting to a Client/Core setup: 

https://ulixee.org/docs/hero/advanced-concepts/client-vs-core
`);
        }
        createOptions.connectionToCore = { host: getCoreHost() };
        super(createOptions);
    }
}
exports.default = Hero;
async function getCoreHost() {
    let coreHost = hosts_1.default.global.getVersionHost(version);
    if (coreHost?.startsWith('localhost')) {
        coreHost = await hosts_1.default.global.checkLocalVersionHost(version, coreHost);
    }
    // start a cloud if none already started
    if (!coreHost) {
        const cloud = new cloud_1.CloudNode();
        await cloud.listen();
        coreHost = await cloud.address;
        console.log('Started Ulixee Cloud at %s', coreHost);
    }
    else {
        console.log('Connecting to Ulixee Cloud at %s', coreHost);
    }
    hero_core_1.default.events.once('browser-has-no-open-windows', ({ browser }) => browser.close());
    hero_core_1.default.events.once('all-browsers-closed', () => {
        console.log('Automatically shutting down Hero Core (Browser Closed)');
        return hero_core_1.default.shutdown();
    });
    return coreHost;
}
//# sourceMappingURL=index.js.map