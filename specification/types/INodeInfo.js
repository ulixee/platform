"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeInfoSchema = void 0;
const specification_1 = require("@ulixee/specification");
const common_1 = require("@ulixee/specification/common");
exports.NodeInfoSchema = specification_1.z.object({
    nodeId: common_1.identityValidation.describe('Network identity of the node.'),
    kadHost: specification_1.z.string().describe('Host where this peer is reachable in network'),
    apiHost: specification_1.z.string().describe('IpOrDomain:port where Ulixee APIs are reachable.'),
});
//# sourceMappingURL=INodeInfo.js.map