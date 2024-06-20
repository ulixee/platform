"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicesSetupSchema = void 0;
const specification_1 = require("@ulixee/specification");
exports.ServicesSetupSchema = specification_1.z.object({
    datastoreRegistryHost: specification_1.z.string().url().optional(),
    storageEngineHost: specification_1.z.string().url().optional(),
    statsTrackerHost: specification_1.z.string().url().optional(),
    nodeRegistryHost: specification_1.z.string().url().optional(),
    replayRegistryHost: specification_1.z.string().url().optional(),
});
//# sourceMappingURL=IServicesSetup.js.map