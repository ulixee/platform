import { z } from '@ulixee/specification';
import { MicronoteSchema } from '@ulixee/specification/types/IMicronote';

export const PaymentSchema = z.object({
  micronote: MicronoteSchema.extend({
    holdAuthorizationCode: z
      .string()
      .length(16)
      .optional()
      .describe('A hold authorization code granting sub-holds on a micronote.'),
  }).optional(),
  credits: z
    .object({
      id: z
        .string()
        .length(11)
        .regex(
          /^crd[A-Za-z0-9_]{8}$/,
          'This is not a Datastore credits id (starting with "cred", following by 8 alphanumeric characters).',
        ),
      secret: z.string().length(12),
    })
    .optional(),
});

type IPayment = z.infer<typeof PaymentSchema>;

export default IPayment;
