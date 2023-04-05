import { IZodHandlers, IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
import { CloudApiSchemas } from './CloudApis';

export type ICloudApiTypes = IZodSchemaToApiTypes<typeof CloudApiSchemas>;

export type ICloudApis = IZodHandlers<typeof CloudApiSchemas>;

export default CloudApiSchemas;
