import { z } from '@ulixee/specification';
import { identityValidation } from '@ulixee/specification/common';

export const NodeInfoSchema = z.object({
  nodeId: identityValidation.describe('Network identity of the node.'),
  apiHost: z.string().describe('IpOrDomain:port where Ulixee APIs are reachable.'),
});

type INodeInfo = z.infer<typeof NodeInfoSchema>;
export default INodeInfo;
