/// <reference types="node" />
import { z } from '@ulixee/specification';
export declare const PaymentSchema: z.ZodObject<{
    micronote: z.ZodOptional<z.ZodObject<{
        microgons: z.ZodNumber;
        micronoteId: z.ZodString;
        blockHeight: z.ZodNumber;
        batchSlug: z.ZodString;
        micronoteBatchUrl: z.ZodString;
        micronoteBatchIdentity: z.ZodString;
        micronoteSignature: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
        sidechainIdentity: z.ZodString;
        sidechainValidationSignature: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
        guaranteeBlockHeight: z.ZodNumber;
        holdAuthorizationCode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        microgons: number;
        micronoteId: string;
        blockHeight: number;
        batchSlug: string;
        micronoteBatchUrl: string;
        micronoteBatchIdentity: string;
        micronoteSignature: Buffer;
        sidechainIdentity: string;
        sidechainValidationSignature: Buffer;
        guaranteeBlockHeight: number;
        holdAuthorizationCode?: string | undefined;
    }, {
        microgons: number;
        micronoteId: string;
        blockHeight: number;
        batchSlug: string;
        micronoteBatchUrl: string;
        micronoteBatchIdentity: string;
        micronoteSignature: Buffer;
        sidechainIdentity: string;
        sidechainValidationSignature: Buffer;
        guaranteeBlockHeight: number;
        holdAuthorizationCode?: string | undefined;
    }>>;
    credits: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        secret: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        secret: string;
    }, {
        id: string;
        secret: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    micronote?: {
        microgons: number;
        micronoteId: string;
        blockHeight: number;
        batchSlug: string;
        micronoteBatchUrl: string;
        micronoteBatchIdentity: string;
        micronoteSignature: Buffer;
        sidechainIdentity: string;
        sidechainValidationSignature: Buffer;
        guaranteeBlockHeight: number;
        holdAuthorizationCode?: string | undefined;
    } | undefined;
    credits?: {
        id: string;
        secret: string;
    } | undefined;
}, {
    micronote?: {
        microgons: number;
        micronoteId: string;
        blockHeight: number;
        batchSlug: string;
        micronoteBatchUrl: string;
        micronoteBatchIdentity: string;
        micronoteSignature: Buffer;
        sidechainIdentity: string;
        sidechainValidationSignature: Buffer;
        guaranteeBlockHeight: number;
        holdAuthorizationCode?: string | undefined;
    } | undefined;
    credits?: {
        id: string;
        secret: string;
    } | undefined;
}>;
declare type IPayment = z.infer<typeof PaymentSchema>;
export default IPayment;
