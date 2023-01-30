"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testRunner = void 0;
const isArray_1 = require("lodash-es/isArray");
function testRunner() {
    return (0, isArray_1.default)([]) ? 'true' : 'not an array';
}
exports.testRunner = testRunner;
//# sourceMappingURL=helper.js.map