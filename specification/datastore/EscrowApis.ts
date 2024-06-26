import { z } from 'zod';
import { datastoreIdValidation } from '../types/datastoreIdValidation';
import { BalanceChangeSchema } from '../types/IBalanceChange';
import { NoteSchema } from '../types/INote';
import { IZodSchemaToApiTypes } from '../utils/IZodApi';

export const EscrowApisSchema = {
  'Escrow.register': {
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
};

export interface IEscrowEvents {

}

type IEscrowApiTypes = IZodSchemaToApiTypes<typeof EscrowApisSchema>;

export default IEscrowApiTypes;
