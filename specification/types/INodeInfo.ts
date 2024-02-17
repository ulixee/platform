import { z } from 'zod';
import { identityValidation } from '@ulixee/platform-specification/types';

export const NodeInfoSchema = z.object({
  nodeId: identityValidation.describe('Network identity of the node.'),
  apiHost: z.string().describe('IpOrDomain:port where Ulixee APIs are reachable.'),
});

type INodeInfo = z.infer<typeof NodeInfoSchema>;
export default INodeInfo;
