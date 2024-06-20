"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicesSetupApiSchemas = void 0;
const specification_1 = require("@ulixee/specification");
const IServicesSetup_1 = require("../types/IServicesSetup");
exports.ServicesSetupApiSchemas = {
    'Services.getSetup': {
        args: specification_1.z.object({}).describe('Request default services setup from a node in the cluster.'),
        result: IServicesSetup_1.ServicesSetupSchema,
    },
};
//# sourceMappingURL=SetupApis.js.map