import { z } from '@ulixee/specification';
import { IZodHandlers, IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';

export const ReplayRegistryApiSchemas = {
  'ReplayRegistry.store': {
    args: z.object({
      sessionId: z.string().describe('The session id of this Hero Replay session.'),
      timestamp: z.number().describe('Unix millis since epoch.'),
      db: z.instanceof(Buffer).describe('The compressed raw bytes of the database.'),
    }),
    result: z.object({
      success: z.boolean(),
    }),
  },
  'ReplayRegistry.get': {
    args: z.object({
      sessionId: z.string(),
    }),
    result: z.object({
      db: z.instanceof(Buffer).describe('Compressed raw bytes of the database.'),
    }),
  },
  'ReplayRegistry.ids': {
    args: z.object({}),
    result: z.object({
      sessionIds: z.string().array(),
    }),
  },
};

export type IReplayRegistryApiTypes = IZodSchemaToApiTypes<typeof ReplayRegistryApiSchemas>;
export type IReplayRegistryApis<TContext = any> = IZodHandlers<
  typeof ReplayRegistryApiSchemas,
  TContext
>;

export default IReplayRegistryApiTypes;
