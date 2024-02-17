import { z } from 'zod';
import { microgonsValidation } from '../types';
import { datastoreIdValidation } from '../types/datastoreIdValidation';
import { BalanceChangeSchema } from '../types/IBalanceChange';
import { NoteSchema } from '../types/INote';
import { escrowIdValidation, PaymentSchema } from '../types/IPayment';
import { IZodHandlers, IZodSchemaToApiTypes } from '../utils/IZodApi';

export const EscrowServiceApiSchemas = {
  'EscrowService.importEscrow': {
    args: z.object({
      datastoreId: datastoreIdValidation,
      escrow: BalanceChangeSchema.describe(
        'An escrow balance change putting funds on hold for this datastore.',
      ).extend({
        escrowHoldNote: NoteSchema.describe('The active escrow hold note'),
      }),
    }),
    result: z.object({
      accepted: z.boolean(),
    }),
  },
  'EscrowService.debitPayment': {
    args: z.object({
      datastoreId: datastoreIdValidation,
      queryId: z.string(),
      payment: PaymentSchema,
    }),
    result: z.object({
      shouldFinalize: z.boolean(),
    }),
  },
  'EscrowService.finalizePayment': {
    args: z.object({
      datastoreId: datastoreIdValidation,
      escrowId: escrowIdValidation,
      uuid: z.string().length(21),
      finalMicrogons: microgonsValidation,
    }),
    result: z.void(),
  },
};

export type IEscrowServiceApiTypes = IZodSchemaToApiTypes<typeof EscrowServiceApiSchemas>;
export type IEscrowServiceApis<TContext = any> = IZodHandlers<
  typeof EscrowServiceApiSchemas,
  TContext
>;

export default IEscrowServiceApiTypes;
