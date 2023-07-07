import { z } from '@ulixee/specification';

export const SecureKadRecordSchema = z.object({
  publicKey: z.instanceof(Buffer).refine(x => x.byteLength === 32, 'Public key must be 32 bytes'),
  signature: z.instanceof(Buffer).refine(x => x.byteLength === 64, 'Signature must be 64 bytes'),
  timestamp: z
    .number()
    .describe(
      'Millis since the epoch. This timestamp is part of the signature and determines "newest" version',
    ),
  value: z.string().describe('A TypeSerialized string value containing the payload of this record'),
});

type ISecureKadRecord = z.infer<typeof SecureKadRecordSchema>;

export default ISecureKadRecord;
