import { z } from 'zod';
import { addressValidation, milligonsValidation, multiSignatureValidation } from './index';
import { NoteSchema } from './INote';

export enum AccountType {
  Tax = 'tax',
  Deposit = 'deposit',
}

export const notaryIdValidation = z.number().int().positive();
export const tickValidation = z
  .number()
  .int()
  .nonnegative()
  .describe('The system tick (one per minute starting at the time of genesis)');
export const notebookNumberValidation = z
  .number()
  .int()
  .positive()
  .describe(
    'The sequence number of a notebook (a collection of balance changes, votes and domain registrations)',
  );

export const AccountOriginSchema = z.object({
  notebookNumber: notebookNumberValidation.describe('The notebook where this account originated'),
  accountUid: z.number().int().describe('The unique user index in the given notebook'),
});

export const MerkleProofSchema = z.object({
  proof: z.instanceof(Uint8Array).array(),
  numberOfLeaves: z.number().int().nonnegative(),
  leafIndex: z.number().int().nonnegative(),
});

export const BalanceProofSchema = z.object({
  notaryId: notaryIdValidation.describe('The notary where this proof was provided'),
  notebookNumber: notebookNumberValidation,
  tick: tickValidation,
  balance: milligonsValidation.describe('The previous balance'),
  accountOrigin: AccountOriginSchema,
  notebookProof: MerkleProofSchema.nullish().describe(
    'The proof that this balance change can be found in the published accountChangesRoot for the given notebook',
  ),
});

export const AccountTypeSchema = z.nativeEnum(AccountType).describe('The type of account');

export const BalanceChangeSchema = z.object({
  accountId: addressValidation,
  accountType: AccountTypeSchema,
  changeNumber: z.number().int().nonnegative(),
  balance: milligonsValidation.describe('The new balance of the account'),
  previousBalanceProof: BalanceProofSchema.nullish().describe(
    'A balance change must provide proof of a previous balance if the change_number is non-zero',
  ),
  escrowHoldNote: NoteSchema.nullish().describe(
    'A hold note currently active on the account (if applicable)',
  ),
  notes: z.array(NoteSchema).max(100).describe('The applied changes'),
  signature: multiSignatureValidation.describe("The account's signature of the balance change hash"),
});

type IBalanceChange = z.infer<typeof BalanceChangeSchema>;

export default IBalanceChange;
