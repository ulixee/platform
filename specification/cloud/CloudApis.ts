import { z } from '@ulixee/specification';
import { IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';

export const CloudApiSchemas = {
  'Cloud.status': {
    args: z.object({}),
    result: z.object({
      version: z.string({ description: 'The version of Ulixee.' }),
      nodes: z.number().describe('Number of installed nodes.'),
    }),
  },
};

type ICloudApiTypes = IZodSchemaToApiTypes<typeof CloudApiSchemas>;

export default ICloudApiTypes;
