import { z } from 'zod';
import { datastoreIdValidation } from '../types/datastoreIdValidation';
import { BalanceChangeSchema } from '../types/IBalanceChange';
import { NoteSchema } from '../types/INote';
import { IZodSchemaToApiTypes } from '../utils/IZodApi';

export const ChannelHoldApisSchema = {
  'ChannelHold.register': {
    args: z.object({
      datastoreId: datastoreIdValidation,
      channelHold: BalanceChangeSchema.describe(
        'A ChannelHold balance change putting funds on hold for this datastore.',
      ).extend({
        channelHoldNote: NoteSchema.describe('The active channel hold note'),
      }),
    }),
    result: z.object({
      accepted: z.boolean(),
    }),
  },
};

export interface IChannelHoldEvents {

}

type IChannelHoldApiTypes = IZodSchemaToApiTypes<typeof ChannelHoldApisSchema>;

export default IChannelHoldApiTypes;
