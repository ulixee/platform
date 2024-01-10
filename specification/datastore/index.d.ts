import { IZodHandlers, IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
import { DatastoreApiSchemas } from './DatastoreApis';
export declare type IDatastoreApiTypes = IZodSchemaToApiTypes<typeof DatastoreApiSchemas>;
export declare type IDatastoreApis = IZodHandlers<typeof DatastoreApiSchemas>;
export default DatastoreApiSchemas;
