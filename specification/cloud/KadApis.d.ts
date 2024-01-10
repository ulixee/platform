/// <reference types="node" />
import { z } from '@ulixee/specification';
import { IZodHandlers, IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
export declare const KadApiSchemas: {
    'Kad.connect': {
        args: z.ZodObject<{
            nodeInfo: z.ZodObject<{
                nodeId: z.ZodString;
                kadHost: z.ZodString;
                apiHost: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }>;
            presharedNonce: z.ZodString;
            connectToNodeId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            nodeInfo: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            };
            presharedNonce: string;
            connectToNodeId?: string | undefined;
        }, {
            nodeInfo: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            };
            presharedNonce: string;
            connectToNodeId?: string | undefined;
        }>;
        result: z.ZodObject<{
            nodeInfo: z.ZodObject<{
                nodeId: z.ZodString;
                kadHost: z.ZodString;
                apiHost: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }>;
            nonce: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            nodeInfo: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            };
            nonce: string;
        }, {
            nodeInfo: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            };
            nonce: string;
        }>;
    };
    'Kad.verify': {
        args: z.ZodObject<{
            signature: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
        }, "strip", z.ZodTypeAny, {
            signature: Buffer;
        }, {
            signature: Buffer;
        }>;
        result: z.ZodObject<{
            signature: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
        }, "strip", z.ZodTypeAny, {
            signature: Buffer;
        }, {
            signature: Buffer;
        }>;
    };
    'Kad.findNode': {
        args: z.ZodObject<{
            key: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
        }, "strip", z.ZodTypeAny, {
            key: Buffer;
        }, {
            key: Buffer;
        }>;
        result: z.ZodObject<{
            closerPeers: z.ZodArray<z.ZodObject<{
                nodeId: z.ZodString;
                kadHost: z.ZodString;
                apiHost: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            closerPeers: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }[];
        }, {
            closerPeers: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }[];
        }>;
    };
    'Kad.ping': {
        args: z.ZodUndefined;
        result: z.ZodUndefined;
    };
    'Kad.provide': {
        args: z.ZodObject<{
            key: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
        }, "strip", z.ZodTypeAny, {
            key: Buffer;
        }, {
            key: Buffer;
        }>;
        result: z.ZodObject<{
            closerPeers: z.ZodArray<z.ZodObject<{
                nodeId: z.ZodString;
                kadHost: z.ZodString;
                apiHost: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            closerPeers: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }[];
        }, {
            closerPeers: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }[];
        }>;
    };
    'Kad.findProviders': {
        args: z.ZodObject<{
            key: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
        }, "strip", z.ZodTypeAny, {
            key: Buffer;
        }, {
            key: Buffer;
        }>;
        result: z.ZodObject<{
            closerPeers: z.ZodArray<z.ZodObject<{
                nodeId: z.ZodString;
                kadHost: z.ZodString;
                apiHost: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }>, "many">;
            providerPeers: z.ZodArray<z.ZodObject<{
                nodeId: z.ZodString;
                kadHost: z.ZodString;
                apiHost: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            closerPeers: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }[];
            providerPeers: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }[];
        }, {
            closerPeers: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }[];
            providerPeers: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }[];
        }>;
    };
    'Kad.put': {
        args: z.ZodObject<{
            key: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
            record: z.ZodObject<{
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
        }, "strip", z.ZodTypeAny, {
            key: Buffer;
            record: {
                value: string;
                publicKey: Buffer;
                signature: Buffer;
                timestamp: number;
            };
        }, {
            key: Buffer;
            record: {
                value: string;
                publicKey: Buffer;
                signature: Buffer;
                timestamp: number;
            };
        }>;
        result: z.ZodObject<{
            newerRecord: z.ZodOptional<z.ZodObject<{
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
            }>>;
            closerPeers: z.ZodArray<z.ZodObject<{
                nodeId: z.ZodString;
                kadHost: z.ZodString;
                apiHost: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            closerPeers: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }[];
            newerRecord?: {
                value: string;
                publicKey: Buffer;
                signature: Buffer;
                timestamp: number;
            } | undefined;
        }, {
            closerPeers: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }[];
            newerRecord?: {
                value: string;
                publicKey: Buffer;
                signature: Buffer;
                timestamp: number;
            } | undefined;
        }>;
    };
    'Kad.get': {
        args: z.ZodObject<{
            key: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
        }, "strip", z.ZodTypeAny, {
            key: Buffer;
        }, {
            key: Buffer;
        }>;
        result: z.ZodObject<{
            record: z.ZodObject<{
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
            closerPeers: z.ZodArray<z.ZodObject<{
                nodeId: z.ZodString;
                kadHost: z.ZodString;
                apiHost: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }, {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            closerPeers: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }[];
            record: {
                value: string;
                publicKey: Buffer;
                signature: Buffer;
                timestamp: number;
            };
        }, {
            closerPeers: {
                nodeId: string;
                kadHost: string;
                apiHost: string;
            }[];
            record: {
                value: string;
                publicKey: Buffer;
                signature: Buffer;
                timestamp: number;
            };
        }>;
    };
};
export declare type IKadApis<TContext = any> = IZodHandlers<typeof KadApiSchemas, TContext>;
export declare type IKadApiTypes = IZodSchemaToApiTypes<typeof KadApiSchemas>;
export default IKadApiTypes;
