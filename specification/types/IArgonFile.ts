import { z } from 'zod';
import { BalanceChangeSchema } from './IBalanceChange';
import { microgonsValidation } from './index';

export const ARGON_FILE_EXTENSION = 'argon';
export const ArgonFileSchema = z.object({
  version: z.string(),
  credit: z
    .object({
      datastoreUrl: z.string().url('The connection string to the datastore'),
      microgons: microgonsValidation.describe('The granted number of microgons.'),
    })
    .optional()
    .nullish(),
  send: BalanceChangeSchema.array().optional().nullish(),
  request: BalanceChangeSchema.array().optional().nullish(),
});

type IArgonFile = z.infer<typeof ArgonFileSchema>;

export default IArgonFile;
