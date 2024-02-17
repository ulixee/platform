import { z } from 'zod';
import { NotarizationSchema } from './INotarization';

export const ArgonFileSchema = z.object({
  credit: z
    .object({
      datastoreUrl: z.string().url('The connection string to the datastore'),
      microgons: z.number().int().positive().describe('The granted number of microgons.'),
    })
    .optional(),
  notarization: NotarizationSchema,
});

type IArgonFile = z.infer<typeof ArgonFileSchema>;

export default IArgonFile;
