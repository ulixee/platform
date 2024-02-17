import { z } from 'zod';

export const addressValidation = z
  .string()
  .length(48)
  .regex(/[1-9A-HJ-NP-Za-km-z]+/); // base 58

export const identityValidation = z
  .string()
  .length(61)
  .regex(
    /^id1[ac-hj-np-z02-9]{58}/,
    'This is not a Ulixee identity (Bech32m encoded public key starting with "id1").',
  );

export const identitySignatureValidation = z.instanceof(Buffer).refine(x => x.length === 64, {
  message: 'Signatures must be 64 bytes',
});

export const hashValidation = z.preprocess(
  bufferPreprocess,
  z.instanceof(Buffer).refine(x => x.length === 32, { message: 'Hashes must be 32 bytes' }),
);

export const multiSignatureValidation = z.preprocess(
  bufferPreprocess,
  z.instanceof(Buffer).refine(x => x.length === 65 || x.length === 66, {
    message:
      'Signatures must be 64 or 65 bytes, and must have a byte for the encoded type of signature',
  }),
);

export const milligonsValidation = z.preprocess(x => {
  if (typeof x === 'string') {
    if (x.endsWith('n')) x = x.slice(0, -1);
    return BigInt(x as string);
  }
  if (typeof x === 'number') return BigInt(x);
  return x;
}, z.bigint().gte(0n));

export const microgonsValidation = z.number().nonnegative();

export function bufferPreprocess(x: string | Uint8Array | Buffer): Buffer {
  if (typeof x === 'string') {
    if (x.startsWith('0x')) x = x.slice(2);
    return Buffer.from(x, 'hex');
  }
  if (x instanceof Uint8Array) return Buffer.from(x);
  return x;
}
