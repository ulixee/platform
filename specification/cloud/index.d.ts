import { IZodHandlers, IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
import { CloudApiSchemas } from './CloudApis';
export declare type ICloudApiTypes = IZodSchemaToApiTypes<typeof CloudApiSchemas>;
export declare type ICloudApis = IZodHandlers<typeof CloudApiSchemas>;
export default CloudApiSchemas;
