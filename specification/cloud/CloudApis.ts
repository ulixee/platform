import { z } from 'zod';
import { IZodSchemaToApiTypes } from '../utils/IZodApi';

export const CloudApiSchemas = {
  'Cloud.status': {
    args: z.object({}),
    result: z.object({
      version: z.string({ description: 'The version of Ulixee.' }),
      nodes: z.number().describe('Number of known nodes.'),
    }),
  },
};

type ICloudApiTypes = IZodSchemaToApiTypes<typeof CloudApiSchemas>;

export default ICloudApiTypes;
