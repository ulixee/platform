"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = exports.createNodeIds = void 0;
const Identity_1 = require("@ulixee/crypto/lib/Identity");
function createNodeIds(count) {
    return Array(count)
        .fill(0)
        .map(Identity_1.default.createSync)
        .map(x => x.bech32);
}
exports.createNodeIds = createNodeIds;
function delay(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}
exports.delay = delay;
//# sourceMappingURL=_helpers.js.map