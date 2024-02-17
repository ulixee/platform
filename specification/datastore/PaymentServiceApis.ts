import { z } from 'zod';
import { identitySignatureValidation, identityValidation, microgonsValidation } from '../types';
import { datastoreIdValidation } from '../types/datastoreIdValidation';
import { DatastorePaymentRecipientSchema } from '../types/IDatastoreManifest';
import { PaymentSchema } from '../types/IPayment';
import { semverValidation } from '../types/semverValidation';
import { IZodSchemaToApiTypes } from '../utils/IZodApi';

export const PaymentServiceApisSchema = {
  'PaymentService.authenticate': {
    args: z.object({
      authentication: z
        .object({
          identity: identityValidation,
          signature: identitySignatureValidation,
          nonce: z.string().length(10).describe('A random nonce adding signature noise.'),
        })
        .optional()
        .describe(
          'An optional authentication mechanism for this payment reservation. Should be pre-arranged with the payment service',
        ),
    }),
    result: z.object({
      authenticationToken: z.string(),
    }),
  },
  'PaymentService.reserve': {
    args: z.object({
      id: datastoreIdValidation.describe('The datastore id'),
      version: semverValidation.describe('The datastore version'),
      microgons: microgonsValidation.describe('Amount to reserve'),
      host: z.string().describe('The datastore host'),
      recipient: DatastorePaymentRecipientSchema,
      domain: z.string().optional().describe('The datastore domain if applicable'),
      authenticationToken: z.string().optional(),
    }),
    result: PaymentSchema,
  },
  'PaymentService.finalize': {
    args: PaymentSchema.pick({ uuid: true, microgons: true }).extend({
      finalMicrogons: microgonsValidation,
      authenticationToken: z.string().optional(),
    }),
    result: z.void(),
  },
};

type IPaymentServiceApiTypes = IZodSchemaToApiTypes<typeof PaymentServiceApisSchema>;

export default IPaymentServiceApiTypes;
