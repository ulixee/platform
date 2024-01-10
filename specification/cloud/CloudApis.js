"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudApiSchemas = void 0;
const specification_1 = require("@ulixee/specification");
exports.CloudApiSchemas = {
    'Cloud.status': {
        args: specification_1.z.object({}),
        result: specification_1.z.object({
            version: specification_1.z.string({ description: 'The version of Ulixee.' }),
            nodes: specification_1.z.number().describe('Number of known nodes.'),
        }),
    },
};
//# sourceMappingURL=CloudApis.js.map