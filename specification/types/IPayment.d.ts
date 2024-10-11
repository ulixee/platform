/// <reference types="node" />
import { z } from 'zod';
/**
 * This will likely be changed to a specific address for payments (maybe just an extra prefix?). It's a placeholder for now.
 */
export declare const channelHoldIdValidation: z.ZodString;
export declare const PaymentMethodSchema: z.ZodObject<{
    channelHold: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        settledMilligons: z.ZodEffects<z.ZodBigInt, bigint, unknown>;
        settledSignature: z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        settledMilligons: bigint;
        settledSignature: Buffer;
    }, {
        id: string;
        settledMilligons?: unknown;
        settledSignature?: unknown;
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
    channelHold?: {
        id: string;
        settledMilligons: bigint;
        settledSignature: Buffer;
    } | undefined;
    credits?: {
        id: string;
        secret: string;
    } | undefined;
}, {
    channelHold?: {
        id: string;
        settledMilligons?: unknown;
        settledSignature?: unknown;
    } | undefined;
    credits?: {
        id: string;
        secret: string;
    } | undefined;
}>;
export declare const PaymentSchema: z.ZodObject<z.objectUtil.extendShape<{
    channelHold: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        settledMilligons: z.ZodEffects<z.ZodBigInt, bigint, unknown>;
        settledSignature: z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        settledMilligons: bigint;
        settledSignature: Buffer;
    }, {
        id: string;
        settledMilligons?: unknown;
        settledSignature?: unknown;
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
}, {
    uuid: z.ZodString;
    microgons: z.ZodNumber;
}>, "strip", z.ZodTypeAny, {
    uuid: string;
    microgons: number;
    channelHold?: {
        id: string;
        settledMilligons: bigint;
        settledSignature: Buffer;
    } | undefined;
    credits?: {
        id: string;
        secret: string;
    } | undefined;
}, {
    uuid: string;
    microgons: number;
    channelHold?: {
        id: string;
        settledMilligons?: unknown;
        settledSignature?: unknown;
    } | undefined;
    credits?: {
        id: string;
        secret: string;
    } | undefined;
}>;
type IPayment = z.infer<typeof PaymentSchema>;
type IPaymentMethod = z.infer<typeof PaymentMethodSchema>;
export { IPaymentMethod };
export default IPayment;
