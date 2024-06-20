"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayRegistryApiSchemas = void 0;
const specification_1 = require("@ulixee/specification");
exports.ReplayRegistryApiSchemas = {
    'ReplayRegistry.store': {
        args: specification_1.z.object({
            sessionId: specification_1.z.string().describe('The session id of this Hero Replay session.'),
            timestamp: specification_1.z.number().describe('Unix millis since epoch.'),
            db: specification_1.z.instanceof(Buffer).describe('The compressed raw bytes of the database.'),
        }),
        result: specification_1.z.object({
            success: specification_1.z.boolean(),
        }),
    },
    'ReplayRegistry.get': {
        args: specification_1.z.object({
            sessionId: specification_1.z.string(),
        }),
        result: specification_1.z.object({
            db: specification_1.z.instanceof(Buffer).describe('Compressed raw bytes of the database.'),
        }),
    },
    'ReplayRegistry.ids': {
        args: specification_1.z.object({}),
        result: specification_1.z.object({
            sessionIds: specification_1.z.string().array(),
        }),
    },
};
//# sourceMappingURL=ReplayRegistryApis.js.map