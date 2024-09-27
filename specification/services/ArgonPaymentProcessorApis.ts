import { z } from 'zod';
import { microgonsValidation } from '../types';
import { datastoreIdValidation } from '../types/datastoreIdValidation';
import { BalanceChangeSchema } from '../types/IBalanceChange';
import { DatastorePaymentRecipientSchema } from '../types/IDatastoreManifest';
import { NoteSchema } from '../types/INote';
import { channelHoldIdValidation, PaymentSchema } from '../types/IPayment';
import { IZodHandlers, IZodSchemaToApiTypes } from '../utils/IZodApi';

export const ArgonPaymentProcessorApiSchema = {
  'ArgonPaymentProcessor.getPaymentInfo': {
    args: z.void(),
    result: DatastorePaymentRecipientSchema,
  },
  'ArgonPaymentProcessor.importChannelHold': {
    args: z.object({
      datastoreId: datastoreIdValidation,
      channelHold: BalanceChangeSchema.describe(
        'A ChannelHold balance change putting funds on hold for this datastore.',
      ).extend({
        channelHoldNote: NoteSchema.describe('The active ChannelHold note'),
      }),
    }),
    result: z.object({
      accepted: z.boolean(),
    }),
  },
  'ArgonPaymentProcessor.debit': {
    args: z.object({
      datastoreId: datastoreIdValidation,
      queryId: z.string(),
      payment: PaymentSchema,
    }),
    result: z.object({
      shouldFinalize: z.boolean(),
    }),
  },
  'ArgonPaymentProcessor.finalize': {
    args: z.object({
      datastoreId: datastoreIdValidation,
      channelHoldId: channelHoldIdValidation,
      uuid: z.string().length(21),
      finalMicrogons: microgonsValidation,
    }),
    result: z.void(),
  },
};

export type IArgonPaymentProcessorApiTypes = IZodSchemaToApiTypes<
  typeof ArgonPaymentProcessorApiSchema
>;
export type IArgonPaymentProcessorApis<TContext = any> = IZodHandlers<
  typeof ArgonPaymentProcessorApiSchema,
  TContext
>;

export default IArgonPaymentProcessorApiTypes;
