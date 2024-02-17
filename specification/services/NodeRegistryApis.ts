import { z } from 'zod';
import { identityValidation } from '@ulixee/platform-specification/types';
import { IZodHandlers, IZodSchemaToApiTypes } from '../utils/IZodApi';
import { NodeInfoSchema } from '../types/INodeInfo';

const CloudNodeMetaSchema = NodeInfoSchema.extend({
  isClusterNode: z.boolean(),
  lastSeenDate: z.date(),
});

export const NodeRegistryApiSchemas = {
  'NodeRegistry.register': {
    args: CloudNodeMetaSchema.omit({
      lastSeenDate: true,
      isClusterNode: true,
    }),
    result: z.object({
      nodes: CloudNodeMetaSchema.array().describe(
        'Nodes connected to this host (for use boostrapping connection).',
      ),
    }),
  },
  'NodeRegistry.getNodes': {
    args: z.object({
      count: z.number(),
    }),
    result: z.object({
      nodes: CloudNodeMetaSchema.array(),
    }),
  },
  'NodeRegistry.health': {
    args: z.object({
      nodeId: identityValidation.describe('Network identity of the node.'),
      coreMetrics: z.object({
        datastoreQueries: z.number().describe('Queries since last run-time.'),
        heroSessions: z.number().describe('Hero sessions created since last run-time.'),
        heroPoolSize: z.number().describe('Hero pool size.'),
        heroPoolAvailable: z.number().describe('Hero pool available slots.'),
        periodStartTime: z.date().describe('The start date of these metrics.'),
      }),
      clientConnections: z.number().describe('Clients currently connected to the public api.'),
    }),
    result: z.object({
      success: z.boolean(),
    }),
  },
};

export type ICloudNodeMeta = z.infer<typeof CloudNodeMetaSchema>;
export type INodeRegistryApiTypes = IZodSchemaToApiTypes<typeof NodeRegistryApiSchemas>;
export type INodeRegistryApis<TContext = any> = IZodHandlers<
  typeof NodeRegistryApiSchemas,
  TContext
>;

export default INodeRegistryApiTypes;
