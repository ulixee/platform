"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KadApiSchemas = void 0;
const specification_1 = require("@ulixee/specification");
const common_1 = require("@ulixee/specification/common");
const INodeInfo_1 = require("../types/INodeInfo");
const ISecureKadRecord_1 = require("../types/ISecureKadRecord");
const KadKeySchema = specification_1.z.instanceof(Buffer).refine(x => x.byteLength === 32, 'Key must be 32 bytes');
exports.KadApiSchemas = {
    'Kad.connect': {
        args: specification_1.z.object({
            nodeInfo: INodeInfo_1.NodeInfoSchema.describe('NodeInfo that will be connected with in a future request.'),
            presharedNonce: specification_1.z
                .string()
                .length(18)
                .describe('A pre-sent nonce that this node should reply with.'),
            connectToNodeId: specification_1.z.string().optional().describe('A nodeId to connect with.'),
        }),
        result: specification_1.z.object({
            nodeInfo: INodeInfo_1.NodeInfoSchema.describe("This node's full node info."),
            nonce: specification_1.z.string().length(18).describe('A nonce the node should verify with.'),
        }),
    },
    'Kad.verify': {
        args: specification_1.z.object({
            signature: common_1.signatureValidation.describe('A signature by the connecting Identity of sha256([presharedNonce, nonce, connector nodeId, host nodeId])'),
        }),
        result: specification_1.z.object({
            signature: common_1.signatureValidation.describe('A signature by the host Identity sha256([presharedNonce, nonce, connector nodeId, host nodeId]).'),
        }),
    },
    'Kad.findNode': {
        args: specification_1.z.object({
            key: KadKeySchema,
        }),
        result: specification_1.z.object({
            closerPeers: INodeInfo_1.NodeInfoSchema.array(),
        }),
    },
    'Kad.ping': {
        args: specification_1.z.undefined(),
        result: specification_1.z.undefined(),
    },
    'Kad.provide': {
        args: specification_1.z.object({
            key: KadKeySchema,
        }),
        result: specification_1.z.object({
            closerPeers: INodeInfo_1.NodeInfoSchema.array().describe('Peers closer to the provided value'),
        }),
    },
    'Kad.findProviders': {
        args: specification_1.z.object({
            key: KadKeySchema,
        }),
        result: specification_1.z.object({
            closerPeers: INodeInfo_1.NodeInfoSchema.array().describe('Peers closer to a key in a query'),
            providerPeers: INodeInfo_1.NodeInfoSchema.array(),
        }),
    },
    'Kad.put': {
        args: specification_1.z.object({
            key: KadKeySchema,
            record: ISecureKadRecord_1.SecureKadRecordSchema,
        }),
        result: specification_1.z.object({
            newerRecord: ISecureKadRecord_1.SecureKadRecordSchema.describe('If a newer version exists, it should be returned').optional(),
            closerPeers: INodeInfo_1.NodeInfoSchema.array().describe('Peers closer to the provided value'),
        }),
    },
    'Kad.get': {
        args: specification_1.z.object({
            key: KadKeySchema,
        }),
        result: specification_1.z.object({
            record: ISecureKadRecord_1.SecureKadRecordSchema,
            closerPeers: INodeInfo_1.NodeInfoSchema.array().describe('Peers closer to the provided value'),
        }),
    },
};
//# sourceMappingURL=KadApis.js.map