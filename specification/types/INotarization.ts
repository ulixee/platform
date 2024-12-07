import { z } from 'zod';
import { BalanceChangeSchema } from './IBalanceChange';
import {
  addressValidation,
  hashValidation,
  microgonsValidation,
  multiSignatureValidation,
} from './index';

export const DomainSchema = z.tuple([
  hashValidation.describe('The domain hash'),
  addressValidation.describe('The account id the data domain is registered to.'),
]);

export const BlockVoteSchema = z.object({
  accountId: addressValidation,
  blockHash: hashValidation.describe('The block hash being voted on. Must be in last 2 ticks.'),
  index: z.number().int().nonnegative().describe('An index to provide noise to the vote hash'),
  power: microgonsValidation.describe('The tax applied (and thus multiplier) of this vote'),
  signature: multiSignatureValidation.describe('The signature of the vote hash'),
  blockRewardsAccountId: addressValidation.describe(
    'The account that will receive the block rewards if this vote wins',
  ),
});

export const NotarizationSchema = z.object({
  balanceChanges: BalanceChangeSchema.array().max(25),
  blockVotes: BlockVoteSchema.array().max(100),
  domains: DomainSchema.array().max(100),
});

type INotarization = z.infer<typeof NotarizationSchema>;

export default INotarization;
