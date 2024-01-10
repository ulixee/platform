"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.datastoreIdValidation = exports.datastoreRegex = void 0;
const specification_1 = require("@ulixee/specification");
exports.datastoreRegex = /[a-z0-9-]{2,50}/;
exports.datastoreIdValidation = specification_1.z
    .string()
    .min(2)
    .max(50)
    .regex(new RegExp(`^${exports.datastoreRegex.source}`), 'This is not a valid datastoreId (2-20 alphanumeric characters).');
//# sourceMappingURL=datastoreIdValidation.js.map