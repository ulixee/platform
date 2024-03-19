import { z } from 'zod';
import { addressValidation, hashValidation, milligonsValidation } from './index';

export const SendNote = z.object({
  action: z.literal('send'),
  to: z.array(addressValidation).max(10).optional().nullish(),
});

export const ClaimFromMainchainNote = z.object({
  action: z.literal('claimFromMainchain'),
  accountNonce: z
    .number()
    .int()
    .nonnegative()
    .describe('The system account nonce of this transfer'),
});
export const EscrowHoldNote = z.object({
  action: z.literal('escrowHold'),
  recipient: addressValidation,
  dataDomainHash: hashValidation.optional().nullish(),
});

function createActionLiteral<T extends string>(
  action: T,
): z.ZodObject<{ action: z.ZodLiteral<T> }> {
  return z.object({
    action: z.literal(action),
  });
}

export const LeaseDomain = createActionLiteral('LeaseDomain');

export const NoteSchema = z.object({
  milligons: milligonsValidation,
  noteType: z.discriminatedUnion('action', [
    createActionLiteral('sendToMainchain'),
    ClaimFromMainchainNote,
    createActionLiteral('claim'),
    SendNote,
    createActionLiteral('leaseDomain'),
    createActionLiteral('fee'),
    createActionLiteral('tax'),
    createActionLiteral('sendToVote'),
    EscrowHoldNote,
    createActionLiteral('escrowSettle'),
    createActionLiteral('escrowClaim'),
  ]),
});

type INote = z.infer<typeof NoteSchema>;
export default INote;
