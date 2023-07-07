import { z } from '@ulixee/specification';
import { signatureValidation } from '@ulixee/specification/common';
import { IZodHandlers, IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
import { NodeInfoSchema } from '../types/INodeInfo';
import { SecureKadRecordSchema } from '../types/ISecureKadRecord';

const KadKeySchema = z.instanceof(Buffer).refine(x => x.byteLength === 32, 'Key must be 32 bytes');


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
      connectToNodeId: z.string().optional().describe('A nodeId to connect with.'),
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
      key: KadKeySchema,
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
      key: KadKeySchema,
    }),
    result: z.object({
      closerPeers: NodeInfoSchema.array().describe('Peers closer to the provided value'),
    }),
  },
  'Kad.findProviders': {
    args: z.object({
      key: KadKeySchema,
    }),
    result: z.object({
      closerPeers: NodeInfoSchema.array().describe('Peers closer to a key in a query'),
      providerPeers: NodeInfoSchema.array(),
    }),
  },
  'Kad.put': {
    args: z.object({
      key: KadKeySchema,
      record: SecureKadRecordSchema,
    }),
    result: z.object({
      newerRecord: SecureKadRecordSchema.describe(
        'If a newer version exists, it should be returned',
      ).optional(),
      closerPeers: NodeInfoSchema.array().describe('Peers closer to the provided value'),
    }),
  },
  'Kad.get': {
    args: z.object({
      key: KadKeySchema,
    }),
    result: z.object({
      record: SecureKadRecordSchema,
      closerPeers: NodeInfoSchema.array().describe('Peers closer to the provided value'),
    }),
  },
};

export type IKadApis<TContext = any> = IZodHandlers<typeof KadApiSchemas, TContext>;
export type IKadApiTypes = IZodSchemaToApiTypes<typeof KadApiSchemas>;

export default IKadApiTypes;
