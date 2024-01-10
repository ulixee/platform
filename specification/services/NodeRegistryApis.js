"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeRegistryApiSchemas = void 0;
const specification_1 = require("@ulixee/specification");
const common_1 = require("@ulixee/specification/common");
const INodeInfo_1 = require("../types/INodeInfo");
const CloudNodeMetaSchema = INodeInfo_1.NodeInfoSchema.extend({
    isClusterNode: specification_1.z.boolean(),
    lastSeenDate: specification_1.z.date(),
    kadHost: INodeInfo_1.NodeInfoSchema.shape.kadHost.optional(),
});
exports.NodeRegistryApiSchemas = {
    'NodeRegistry.register': {
        args: CloudNodeMetaSchema.omit({
            lastSeenDate: true,
            isClusterNode: true,
        }),
        result: specification_1.z.object({
            nodes: CloudNodeMetaSchema.array().describe('Nodes connected to this host (for use boostrapping connection).'),
        }),
    },
    'NodeRegistry.getNodes': {
        args: specification_1.z.object({
            count: specification_1.z.number(),
        }),
        result: specification_1.z.object({
            nodes: CloudNodeMetaSchema.array(),
        }),
    },
    'NodeRegistry.health': {
        args: specification_1.z.object({
            nodeId: common_1.identityValidation.describe('Network identity of the node.'),
            coreMetrics: specification_1.z.object({
                datastoreQueries: specification_1.z.number().describe('Queries since last run-time.'),
                heroSessions: specification_1.z.number().describe('Hero sessions created since last run-time.'),
                heroPoolSize: specification_1.z.number().describe('Hero pool size.'),
                heroPoolAvailable: specification_1.z.number().describe('Hero pool available slots.'),
                periodStartTime: specification_1.z.date().describe('The start date of these metrics.'),
            }),
            clientConnections: specification_1.z.number().describe('Clients currently connected to the public api.'),
            peerConnections: specification_1.z
                .number()
                .describe('Peer network nodes that are currently known of and connected.'),
        }),
        result: specification_1.z.object({
            success: specification_1.z.boolean(),
        }),
    },
};
//# sourceMappingURL=NodeRegistryApis.js.map