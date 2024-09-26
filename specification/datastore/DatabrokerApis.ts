import { z } from 'zod';
import {
  addressValidation,
  identitySignatureValidation,
  identityValidation,
  milligonsValidation,
} from '../types';
import { BalanceChangeSchema } from '../types/IBalanceChange';
import { DatastorePaymentRecipientSchema } from '../types/IDatastoreManifest';
import { channelHoldIdValidation } from '../types/IPayment';
import { IZodSchemaToApiTypes } from '../utils/IZodApi';

export const DatabrokerApisSchema = {
  'Databroker.createChannelHold': {
    args: z.object({
      recipient: DatastorePaymentRecipientSchema,
      milligons: milligonsValidation.describe('Amount to reserve'),
      domain: z.string().optional().describe('The datastore domain if applicable'),
      datastoreId: z.string().describe('The datastore id'),
      delegatedSigningAddress: addressValidation.describe(
        'A delegated signing address in SS58 format',
      ),
      authentication: z.object({
        identity: identityValidation.describe('The user identity making this request'),
        signature: identitySignatureValidation.describe('The user signature'),
        nonce: z.string().length(10).describe('A nonce for this request'),
      }),
    }),
    result: z.object({
      channelHoldId: channelHoldIdValidation,
      balanceChange: BalanceChangeSchema,
      expirationDate: z.date().describe('The date this channelHold expires'),
    }),
  },
  'Databroker.getBalance': {
    args: z.object({
      identity: identityValidation.describe('The user identity making this request'),
    }),
    result: z.object({
      balance: milligonsValidation.describe('The balance in milligons'),
    }),
  },
};

type IDatabrokerApiTypes = IZodSchemaToApiTypes<typeof DatabrokerApisSchema>;

export { IDatabrokerApiTypes };

export default IDatabrokerApiTypes;
