import { IZodHandlers, IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
import { DatastoreApiSchemas } from './DatastoreApis';

export type IDatastoreApiTypes = IZodSchemaToApiTypes<typeof DatastoreApiSchemas>;

export type IDatastoreApis = IZodHandlers<typeof DatastoreApiSchemas>;

export default DatastoreApiSchemas;
