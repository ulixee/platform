import { z } from 'zod';
import { microgonsValidation, milligonsValidation, multiSignatureValidation } from './index';

/**
 * This will likely be changed to a specific address for payments (maybe just an extra prefix?). It's a placeholder for now.
 */
export const escrowIdValidation = z
  .string()
  .length(62)
  .regex(
    /^esc1[ac-hj-np-z02-9]{58}/,
    'This is not a Ulixee identity (Bech32m encoded public key starting with "esc1").',
  );

export const PaymentMethodSchema = z.object({
  escrow: z
    .object({
      id: escrowIdValidation,
      settledMilligons: milligonsValidation.describe('The aggregate settled milligons'),
      settledSignature: multiSignatureValidation.describe(
        'A signature of the updated escrow with settled milligons',
      ),
    })
    .optional(),
  credits: z
    .object({
      id: z
        .string()
        .length(11)
        .regex(
          /^crd[A-Za-z0-9_]{8}$/,
          'This is not a Datastore credits id (starting with "crd", following by 8 alphanumeric characters).',
        ),
      secret: z.string().length(12),
    })
    .optional(),
});

export const PaymentSchema = PaymentMethodSchema.extend({
  uuid: z
    .string()
    .length(21)
    .regex(/[A-Za-z0-9_-]{21}/)
    .describe('A one time payment id.'),
  microgons: microgonsValidation,
  // paymentSignature: mulitSignatureValidation
  //   .optional()
  //   .describe('A signature by the escrow account that this is a valid payment id and amount.'),
});

type IPayment = z.infer<typeof PaymentSchema>;
type IPaymentMethod = z.infer<typeof PaymentMethodSchema>;
export { IPaymentMethod };

export default IPayment;
