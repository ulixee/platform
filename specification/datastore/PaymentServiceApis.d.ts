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
                signature: Buffer;
                identity: string;
                nonce: string;
            }, {
                signature: Buffer;
                identity: string;
                nonce: string;
            }>>;
        }, "strip", z.ZodTypeAny, {
            authentication?: {
                signature: Buffer;
                identity: string;
                nonce: string;
            } | undefined;
        }, {
            authentication?: {
                signature: Buffer;
                identity: string;
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
                chain: z.ZodNativeEnum<typeof import("@argonprotocol/localchain").Chain>;
                genesisHash: z.ZodString;
                address: z.ZodString;
                notaryId: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                notaryId: number;
                chain: import("@argonprotocol/localchain").Chain;
                genesisHash: string;
                address: string;
            }, {
                notaryId: number;
                chain: import("@argonprotocol/localchain").Chain;
                genesisHash: string;
                address: string;
            }>;
            domain: z.ZodOptional<z.ZodString>;
            authenticationToken: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            microgons: number;
            version: string;
            recipient: {
                notaryId: number;
                chain: import("@argonprotocol/localchain").Chain;
                genesisHash: string;
                address: string;
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
                chain: import("@argonprotocol/localchain").Chain;
                genesisHash: string;
                address: string;
            };
            host: string;
            domain?: string | undefined;
            authenticationToken?: string | undefined;
        }>;
        result: z.ZodObject<z.objectUtil.extendShape<{
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
    };
    'PaymentService.finalize': {
        args: z.ZodObject<z.objectUtil.extendShape<Pick<z.objectUtil.extendShape<{
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
        }>, "uuid" | "microgons">, {
            finalMicrogons: z.ZodNumber;
            authenticationToken: z.ZodOptional<z.ZodString>;
        }>, "strip", z.ZodTypeAny, {
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
