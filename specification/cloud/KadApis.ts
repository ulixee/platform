import { z } from '@ulixee/specification';
import { signatureValidation } from '@ulixee/specification/common';
import { IZodHandlers, IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
import { NodeInfoSchema } from '../types/INodeInfo';

export const KadApiSchemas = {
  'Kad.connect': {
    args: z.object({
      nodeInfo: NodeInfoSchema.describe(
        'NodeInfo that will be connected with in a future request.',
      ),
      presharedNonce: z
        .string()
        .length(18)
        .describe('A pre-sent nonce that this node should reply with.'),
      connectToNodeId: z.string().describe('A nodeId to connect with.'),
    }),
    result: z.object({
      nodeInfo: NodeInfoSchema.describe("This node's full node info."),
      nonce: z.string().length(18).describe('A nonce the node should verify with.'),
    }),
  },
  'Kad.verify': {
    args: z.object({
      signature: signatureValidation.describe(
        'A signature by the connecting Identity of sha256([presharedNonce, nonce, connector nodeId, host nodeId])',
      ),
    }),
    result: z.object({
      signature: signatureValidation.describe(
        'A signature by the host Identity sha256([presharedNonce, nonce, connector nodeId, host nodeId]).',
      ),
    }),
  },
  'Kad.findNode': {
    args: z.object({
      key: z.instanceof(Buffer).refine(x => x.length > 0, 'Key must have a length greater than 0'),
    }),
    result: z.object({
      closerPeers: NodeInfoSchema.array(),
    }),
  },
  'Kad.ping': {
    args: z.undefined(),
    result: z.undefined(),
  },
  'Kad.provide': {
    args: z.object({
      key: z.instanceof(Buffer).refine(x => x.length > 0, 'Key must have a length greater than 0'),
    }),
    result: z.object({
      closerPeers: NodeInfoSchema.array().describe('Peers closer to the provided value'),
    }),
  },
  'Kad.getProviders': {
    args: z.object({
      key: z.instanceof(Buffer).refine(x => x.length > 0, 'Key must have a length greater than 0'),
    }),
    result: z.object({
      closerPeers: NodeInfoSchema.array().describe('Peers closer to a key in a query'),
      providerPeers: NodeInfoSchema.array(),
    }),
  },
};

export type IKadApis<TContext = any> = IZodHandlers<typeof KadApiSchemas, TContext>;
export type IKadApiTypes = IZodSchemaToApiTypes<typeof KadApiSchemas>;

export default IKadApiTypes;
