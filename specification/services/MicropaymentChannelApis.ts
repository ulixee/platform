import { z } from 'zod';
import { microgonsValidation } from '../types';
import { datastoreIdValidation } from '../types/datastoreIdValidation';
import { BalanceChangeSchema } from '../types/IBalanceChange';
import { NoteSchema } from '../types/INote';
import { channelHoldIdValidation, PaymentSchema } from '../types/IPayment';
import { IZodHandlers, IZodSchemaToApiTypes } from '../utils/IZodApi';

export const MicropaymentChannelApiSchemas = {
  'MicropaymentChannel.importChannelHold': {
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
  'MicropaymentChannel.debitPayment': {
    args: z.object({
      datastoreId: datastoreIdValidation,
      queryId: z.string(),
      payment: PaymentSchema,
    }),
    result: z.object({
      shouldFinalize: z.boolean(),
    }),
  },
  'MicropaymentChannel.finalizePayment': {
    args: z.object({
      datastoreId: datastoreIdValidation,
      channelHoldId: channelHoldIdValidation,
      uuid: z.string().length(21),
      finalMicrogons: microgonsValidation,
    }),
    result: z.void(),
  },
};

export type IMicropaymentChannelApiTypes = IZodSchemaToApiTypes<
  typeof MicropaymentChannelApiSchemas
>;
export type IMicropaymentChannelApis<TContext = any> = IZodHandlers<
  typeof MicropaymentChannelApiSchemas,
  TContext
>;

export default IMicropaymentChannelApiTypes;
