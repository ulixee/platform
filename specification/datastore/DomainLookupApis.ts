import { z } from 'zod';
import { datastoreIdValidation } from '../types/datastoreIdValidation';
import { semverValidation } from '../types/semverValidation';
import { IZodSchemaToApiTypes } from '../utils/IZodApi';

export const DomainLookupApiSchema = {
  'DomainLookup.query': {
    args: z.object({
      datastoreUrl: z.string().describe('The datastore url'),
    }),
    result: z.object({
      datastoreId: datastoreIdValidation,
      version: semverValidation,
      host: z.string(),
      domain: z.string().optional(),
    }),
  },
};

type IDomainLookupApiTypes = IZodSchemaToApiTypes<typeof DomainLookupApiSchema>;

export default IDomainLookupApiTypes;
