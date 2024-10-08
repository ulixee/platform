import { IZodHandlers, IZodSchemaToApiTypes } from '../utils/IZodApi';
import { DatabrokerAdminApisSchema } from './DatabrokerAdminApis';
import { DatabrokerApisSchema } from './DatabrokerApis';
import { DatastoreApiSchemas } from './DatastoreApis';
import { DomainLookupApiSchema } from './DomainLookupApis';
import { ChannelHoldApisSchema, IChannelHoldEvents } from './ChannelHoldApis';
import { PaymentServiceApisSchema } from './PaymentServiceApis';

export type IDatastoreApiTypes = IZodSchemaToApiTypes<typeof DatastoreApiSchemas>;

export type IDatastoreApis = IZodHandlers<typeof DatastoreApiSchemas>;

export type IChannelHoldApis<TContext = any> = IZodHandlers<typeof ChannelHoldApisSchema, TContext>;
export type IPaymentServiceApis<TContext = any> = IZodHandlers<
  typeof PaymentServiceApisSchema,
  TContext
>;
export type IDatabrokerApis<TContext = any> = IZodHandlers<typeof DatabrokerApisSchema, TContext>;
export type IDatabrokerAdminApis<TContext = any> = IZodHandlers<typeof DatabrokerAdminApisSchema, TContext>;

export type IDomainLookupApis<TContext = any> = IZodHandlers<
  typeof DomainLookupApiSchema,
  TContext
>;

export { IChannelHoldEvents };

export default DatastoreApiSchemas;
