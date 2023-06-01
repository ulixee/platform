import { z } from '@ulixee/specification';
import { identityValidation } from '@ulixee/specification/common';

export const NodeInfoSchema = z.object({
  nodeId: identityValidation.describe('Network identity of the node.'),
  kadHost: z.string().describe('Host where this peer is reachable in network'),
  apiHost: z.string().describe('IpOrDomain:port where Ulixee APIs are reachable.'),
});

type INodeInfo = z.infer<typeof NodeInfoSchema>;
export default INodeInfo;
