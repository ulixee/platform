/// <reference types="node" />
import { z } from 'zod';
import { IZodSchemaToApiTypes } from '../utils/IZodApi';
export declare const PaymentServiceApisSchema: {
    'PaymentService.authenticate': {
        args: z.ZodObject<{
            authentication: z.ZodOptional<z.ZodObject<{
                identity: z.ZodString;
                signature: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
                nonce: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                identity: string;
                signature: Buffer;
                nonce: string;
            }, {
                identity: string;
                signature: Buffer;
                nonce: string;
            }>>;
        }, "strip", z.ZodTypeAny, {
            authentication?: {
                identity: string;
                signature: Buffer;
                nonce: string;
            } | undefined;
        }, {
            authentication?: {
                identity: string;
                signature: Buffer;
                nonce: string;
            } | undefined;
        }>;
        result: z.ZodObject<{
            authenticationToken: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            authenticationToken: string;
        }, {
            authenticationToken: string;
        }>;
    };
    'PaymentService.reserve': {
        args: z.ZodObject<{
            id: z.ZodString;
            version: z.ZodString;
            microgons: z.ZodNumber;
            host: z.ZodString;
            recipient: z.ZodObject<{
                address: z.ZodOptional<z.ZodString>;
                notaryId: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                notaryId: number;
                address?: string | undefined;
            }, {
                notaryId: number;
                address?: string | undefined;
            }>;
            domain: z.ZodOptional<z.ZodString>;
            authenticationToken: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            microgons: number;
            version: string;
            recipient: {
                notaryId: number;
                address?: string | undefined;
            };
            host: string;
            domain?: string | undefined;
            authenticationToken?: string | undefined;
        }, {
            id: string;
            microgons: number;
            version: string;
            recipient: {
                notaryId: number;
                address?: string | undefined;
            };
            host: string;
            domain?: string | undefined;
            authenticationToken?: string | undefined;
        }>;
        result: z.ZodObject<{
            escrow: z.ZodOptional<z.ZodObject<{
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
            uuid: z.ZodString;
            microgons: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            uuid: string;
            microgons: number;
            escrow?: {
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
            escrow?: {
                id: string;
                settledMilligons?: unknown;
                settledSignature?: unknown;
            } | undefined;
            credits?: {
                id: string;
                secret: string;
            } | undefined;
        }>;
    };
    'PaymentService.finalize': {
        args: z.ZodObject<{
            uuid: z.ZodString;
            microgons: z.ZodNumber;
            finalMicrogons: z.ZodNumber;
            authenticationToken: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            uuid: string;
            microgons: number;
            finalMicrogons: number;
            authenticationToken?: string | undefined;
        }, {
            uuid: string;
            microgons: number;
            finalMicrogons: number;
            authenticationToken?: string | undefined;
        }>;
        result: z.ZodVoid;
    };
};
type IPaymentServiceApiTypes = IZodSchemaToApiTypes<typeof PaymentServiceApisSchema>;
export default IPaymentServiceApiTypes;
