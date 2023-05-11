import { z } from '@ulixee/specification';
import { IZodHandlers, IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
import { ServicesSetupSchema } from '../types/IServicesSetup';

export const ServicesSetupApiSchemas = {
  'Services.getSetup': {
    args: z.object({}).describe('Request default services setup from a node in the cluster.'),
    result: ServicesSetupSchema,
  },
};

export type IServicesSetupApiTypes = IZodSchemaToApiTypes<typeof ServicesSetupApiSchemas>;
export type IServicesSetupApis = IZodHandlers<typeof ServicesSetupApiSchemas>;

export default IServicesSetupApiTypes;
