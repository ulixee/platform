"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testFunction = void 0;
const isArray_1 = require("lodash-es/isArray");
function testFunction() {
    return (0, isArray_1.default)([]) ? 'true' : 'not an array';
}
exports.testFunction = testFunction;
//# sourceMappingURL=helper.js.map