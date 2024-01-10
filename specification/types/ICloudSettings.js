"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudSettingsSchema = void 0;
const specification_1 = require("@ulixee/specification");
exports.CloudSettingsSchema = specification_1.z.object({
    datastoreRegistryEndpoint: specification_1.z.string().url().optional(),
    storageEngineEndpoint: specification_1.z.string().url().optional(),
    statsEndpoint: specification_1.z.string().url().optional(),
    nodeRegistryEndpoint: specification_1.z.string().url().optional(),
    dhtServices: specification_1.z
        .object({
        datastoreRegistry: specification_1.z.any(),
        nodeRegistry: specification_1.z.any(),
    })
        .optional(),
});
//# sourceMappingURL=ICloudSettings.js.map