/// <reference types="node" />
import { z } from '@ulixee/specification';
export declare const SecureKadRecordSchema: z.ZodObject<{
    publicKey: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
    signature: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
    timestamp: z.ZodNumber;
    value: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    publicKey: Buffer;
    signature: Buffer;
    timestamp: number;
}, {
    value: string;
    publicKey: Buffer;
    signature: Buffer;
    timestamp: number;
}>;
declare type ISecureKadRecord = z.infer<typeof SecureKadRecordSchema>;
export default ISecureKadRecord;
