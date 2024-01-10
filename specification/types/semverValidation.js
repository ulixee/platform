"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.semverValidation = exports.semverRegex = void 0;
const specification_1 = require("@ulixee/specification");
exports.semverRegex = /(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)/;
exports.semverValidation = specification_1.z.string().regex(exports.semverRegex).describe('A semver');
//# sourceMappingURL=semverValidation.js.map