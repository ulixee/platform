/// <reference types="node" />
import { z } from 'zod';
import { IZodSchemaToApiTypes } from '../utils/IZodApi';
export declare const EntityStatsSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["Table", "Extractor", "Crawler"]>;
    stats: z.ZodObject<{
        queries: z.ZodNumber;
        errors: z.ZodNumber;
        totalSpend: z.ZodNumber;
        totalCreditSpend: z.ZodNumber;
        averageBytesPerQuery: z.ZodNumber;
        maxBytesPerQuery: z.ZodNumber;
        averageMilliseconds: z.ZodNumber;
        maxMilliseconds: z.ZodNumber;
        averageTotalPricePerQuery: z.ZodNumber;
        maxPricePerQuery: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        queries: number;
        errors: number;
        totalSpend: number;
        totalCreditSpend: number;
        averageBytesPerQuery: number;
        maxBytesPerQuery: number;
        averageMilliseconds: number;
        maxMilliseconds: number;
        averageTotalPricePerQuery: number;
        maxPricePerQuery: number;
    }, {
        queries: number;
        errors: number;
        totalSpend: number;
        totalCreditSpend: number;
        averageBytesPerQuery: number;
        maxBytesPerQuery: number;
        averageMilliseconds: number;
        maxMilliseconds: number;
        averageTotalPricePerQuery: number;
        maxPricePerQuery: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "Table" | "Extractor" | "Crawler";
    name: string;
    stats: {
        queries: number;
        errors: number;
        totalSpend: number;
        totalCreditSpend: number;
        averageBytesPerQuery: number;
        maxBytesPerQuery: number;
        averageMilliseconds: number;
        maxMilliseconds: number;
        averageTotalPricePerQuery: number;
        maxPricePerQuery: number;
    };
}, {
    type: "Table" | "Extractor" | "Crawler";
    name: string;
    stats: {
        queries: number;
        errors: number;
        totalSpend: number;
        totalCreditSpend: number;
        averageBytesPerQuery: number;
        maxBytesPerQuery: number;
        averageMilliseconds: number;
        maxMilliseconds: number;
        averageTotalPricePerQuery: number;
        maxPricePerQuery: number;
    };
}>;
declare const DatastoreMetadataResult: z.ZodObject<{
    microgons: z.ZodNumber;
    bytes: z.ZodNumber;
    milliseconds: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    microgons: number;
    bytes: number;
    milliseconds: number;
}, {
    microgons: number;
    bytes: number;
    milliseconds: number;
}>;
declare const DatastoreQueryResultSchema: z.ZodObject<{
    latestVersion: z.ZodString;
    runError: z.ZodOptional<z.ZodType<Error, z.ZodTypeDef, Error>>;
    outputs: z.ZodArray<z.ZodOptional<z.ZodAny>, "many">;
    metadata: z.ZodObject<{
        microgons: z.ZodNumber;
        bytes: z.ZodNumber;
        milliseconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        microgons: number;
        bytes: number;
        milliseconds: number;
    }, {
        microgons: number;
        bytes: number;
        milliseconds: number;
    }>;
}, "strip", z.ZodTypeAny, {
    latestVersion: string;
    outputs: any[];
    metadata: {
        microgons: number;
        bytes: number;
        milliseconds: number;
    };
    runError?: Error | undefined;
}, {
    latestVersion: string;
    outputs: any[];
    metadata: {
        microgons: number;
        bytes: number;
        milliseconds: number;
    };
    runError?: Error | undefined;
}>;
declare const DatastoreQueryMetadataSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
    queryId: z.ZodString;
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
    affiliateId: z.ZodOptional<z.ZodString>;
    payment: z.ZodOptional<z.ZodObject<{
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
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    queryId: string;
    authentication?: {
        identity: string;
        signature: Buffer;
        nonce: string;
    } | undefined;
    affiliateId?: string | undefined;
    payment?: {
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
    } | undefined;
}, {
    id: string;
    version: string;
    queryId: string;
    authentication?: {
        identity: string;
        signature: Buffer;
        nonce: string;
    } | undefined;
    affiliateId?: string | undefined;
    payment?: {
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
    } | undefined;
}>;
export declare const DatastoreApiSchemas: {
    'Datastore.upload': {
        args: z.ZodObject<{
            compressedDbx: z.ZodType<Buffer, z.ZodTypeDef, Buffer>;
            adminIdentity: z.ZodOptional<z.ZodString>;
            adminSignature: z.ZodOptional<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>>;
        }, "strip", z.ZodTypeAny, {
            compressedDbx: Buffer;
            adminIdentity?: string | undefined;
            adminSignature?: Buffer | undefined;
        }, {
            compressedDbx: Buffer;
            adminIdentity?: string | undefined;
            adminSignature?: Buffer | undefined;
        }>;
        result: z.ZodObject<{
            success: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            success: boolean;
        }, {
            success: boolean;
        }>;
    };
    'Datastore.download': {
        args: z.ZodObject<{
            id: z.ZodString;
            version: z.ZodString;
            requestDate: z.ZodDate;
            adminIdentity: z.ZodString;
            adminSignature: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            version: string;
            adminSignature: Buffer;
            adminIdentity: string;
            requestDate: Date;
        }, {
            id: string;
            version: string;
            adminSignature: Buffer;
            adminIdentity: string;
            requestDate: Date;
        }>;
        result: z.ZodObject<{
            adminIdentity: z.ZodString;
            adminSignature: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
            compressedDbx: z.ZodType<Buffer, z.ZodTypeDef, Buffer>;
        }, "strip", z.ZodTypeAny, {
            adminSignature: Buffer;
            adminIdentity: string;
            compressedDbx: Buffer;
        }, {
            adminSignature: Buffer;
            adminIdentity: string;
            compressedDbx: Buffer;
        }>;
    };
    'Datastore.start': {
        args: z.ZodObject<{
            id: z.ZodString;
            dbxPath: z.ZodString;
            watch: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            dbxPath: string;
            watch: boolean;
        }, {
            id: string;
            dbxPath: string;
            watch: boolean;
        }>;
        result: z.ZodObject<{
            success: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            success: boolean;
        }, {
            success: boolean;
        }>;
    };
    'Datastore.creditsBalance': {
        args: z.ZodObject<{
            id: z.ZodString;
            version: z.ZodString;
            creditId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            version: string;
            creditId: string;
        }, {
            id: string;
            version: string;
            creditId: string;
        }>;
        result: z.ZodObject<{
            issuedCredits: z.ZodNumber;
            balance: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            balance: number;
            issuedCredits: number;
        }, {
            balance: number;
            issuedCredits: number;
        }>;
    };
    'Datastore.creditsIssued': {
        args: z.ZodObject<{
            id: z.ZodString;
            version: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            version: string;
        }, {
            id: string;
            version: string;
        }>;
        result: z.ZodObject<{
            issuedCredits: z.ZodNumber;
            count: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            count: number;
            issuedCredits: number;
        }, {
            count: number;
            issuedCredits: number;
        }>;
    };
    'Datastore.admin': {
        args: z.ZodObject<{
            id: z.ZodString;
            version: z.ZodString;
            adminIdentity: z.ZodOptional<z.ZodString>;
            adminSignature: z.ZodOptional<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>>;
            adminFunction: z.ZodObject<{
                ownerType: z.ZodEnum<["table", "crawler", "extractor", "datastore"]>;
                ownerName: z.ZodOptional<z.ZodString>;
                functionName: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                ownerType: "datastore" | "table" | "crawler" | "extractor";
                functionName: string;
                ownerName?: string | undefined;
            }, {
                ownerType: "datastore" | "table" | "crawler" | "extractor";
                functionName: string;
                ownerName?: string | undefined;
            }>;
            functionArgs: z.ZodArray<z.ZodAny, "many">;
        }, "strip", z.ZodTypeAny, {
            id: string;
            version: string;
            adminFunction: {
                ownerType: "datastore" | "table" | "crawler" | "extractor";
                functionName: string;
                ownerName?: string | undefined;
            };
            functionArgs: any[];
            adminIdentity?: string | undefined;
            adminSignature?: Buffer | undefined;
        }, {
            id: string;
            version: string;
            adminFunction: {
                ownerType: "datastore" | "table" | "crawler" | "extractor";
                functionName: string;
                ownerName?: string | undefined;
            };
            functionArgs: any[];
            adminIdentity?: string | undefined;
            adminSignature?: Buffer | undefined;
        }>;
        result: z.ZodAny;
    };
    'Datastore.meta': {
        args: z.ZodObject<{
            id: z.ZodString;
            version: z.ZodString;
            includeSchemasAsJson: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            version: string;
            includeSchemasAsJson?: boolean | undefined;
        }, {
            id: string;
            version: string;
            includeSchemasAsJson?: boolean | undefined;
        }>;
        result: z.ZodObject<{
            id: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            version: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            domain: z.ZodOptional<z.ZodString>;
            storageEngineHost: z.ZodOptional<z.ZodString>;
            versionTimestamp: z.ZodNumber;
            scriptHash: z.ZodString;
            adminIdentities: z.ZodArray<z.ZodString, "many">;
            scriptEntrypoint: z.ZodString;
            coreVersion: z.ZodString;
            payment: z.ZodOptional<z.ZodObject<{
                address: z.ZodOptional<z.ZodString>;
                notaryId: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                notaryId: number;
                address?: string | undefined;
            }, {
                notaryId: number;
                address?: string | undefined;
            }>>;
            latestVersion: z.ZodString;
            isStarted: z.ZodBoolean;
            stats: z.ZodObject<{
                queries: z.ZodNumber;
                errors: z.ZodNumber;
                totalSpend: z.ZodNumber;
                totalCreditSpend: z.ZodNumber;
                averageBytesPerQuery: z.ZodNumber;
                maxBytesPerQuery: z.ZodNumber;
                averageMilliseconds: z.ZodNumber;
                maxMilliseconds: z.ZodNumber;
                averageTotalPricePerQuery: z.ZodNumber;
                maxPricePerQuery: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                queries: number;
                errors: number;
                totalSpend: number;
                totalCreditSpend: number;
                averageBytesPerQuery: number;
                maxBytesPerQuery: number;
                averageMilliseconds: number;
                maxMilliseconds: number;
                averageTotalPricePerQuery: number;
                maxPricePerQuery: number;
            }, {
                queries: number;
                errors: number;
                totalSpend: number;
                totalCreditSpend: number;
                averageBytesPerQuery: number;
                maxBytesPerQuery: number;
                averageMilliseconds: number;
                maxMilliseconds: number;
                averageTotalPricePerQuery: number;
                maxPricePerQuery: number;
            }>;
            extractorsByName: z.ZodRecord<z.ZodString, z.ZodObject<{
                description: z.ZodOptional<z.ZodString>;
                stats: z.ZodObject<{
                    queries: z.ZodNumber;
                    errors: z.ZodNumber;
                    totalSpend: z.ZodNumber;
                    totalCreditSpend: z.ZodNumber;
                    averageBytesPerQuery: z.ZodNumber;
                    maxBytesPerQuery: z.ZodNumber;
                    averageMilliseconds: z.ZodNumber;
                    maxMilliseconds: z.ZodNumber;
                    averageTotalPricePerQuery: z.ZodNumber;
                    maxPricePerQuery: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                }, {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                }>;
                netBasePrice: z.ZodNumber;
                schemaAsJson: z.ZodOptional<z.ZodAny>;
                priceBreakdown: z.ZodArray<z.ZodObject<{
                    basePrice: z.ZodNumber;
                    addOns: z.ZodOptional<z.ZodObject<{
                        perKb: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        perKb?: number | undefined;
                    }, {
                        perKb?: number | undefined;
                    }>>;
                    remoteMeta: z.ZodOptional<z.ZodObject<{
                        host: z.ZodString;
                        datastoreId: z.ZodString;
                        datastoreVersion: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    }, {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }, {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                netBasePrice: number;
                priceBreakdown: {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }[];
                description?: string | undefined;
                schemaAsJson?: any;
            }, {
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                netBasePrice: number;
                priceBreakdown: {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }[];
                description?: string | undefined;
                schemaAsJson?: any;
            }>>;
            crawlersByName: z.ZodRecord<z.ZodString, z.ZodObject<{
                description: z.ZodOptional<z.ZodString>;
                stats: z.ZodObject<{
                    queries: z.ZodNumber;
                    errors: z.ZodNumber;
                    totalSpend: z.ZodNumber;
                    totalCreditSpend: z.ZodNumber;
                    averageBytesPerQuery: z.ZodNumber;
                    maxBytesPerQuery: z.ZodNumber;
                    averageMilliseconds: z.ZodNumber;
                    maxMilliseconds: z.ZodNumber;
                    averageTotalPricePerQuery: z.ZodNumber;
                    maxPricePerQuery: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                }, {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                }>;
                netBasePrice: z.ZodNumber;
                schemaAsJson: z.ZodOptional<z.ZodAny>;
                priceBreakdown: z.ZodArray<z.ZodObject<{
                    basePrice: z.ZodNumber;
                    addOns: z.ZodOptional<z.ZodObject<{
                        perKb: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        perKb?: number | undefined;
                    }, {
                        perKb?: number | undefined;
                    }>>;
                    remoteMeta: z.ZodOptional<z.ZodObject<{
                        host: z.ZodString;
                        datastoreId: z.ZodString;
                        datastoreVersion: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    }, {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }, {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                netBasePrice: number;
                priceBreakdown: {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }[];
                description?: string | undefined;
                schemaAsJson?: any;
            }, {
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                netBasePrice: number;
                priceBreakdown: {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }[];
                description?: string | undefined;
                schemaAsJson?: any;
            }>>;
            tablesByName: z.ZodRecord<z.ZodString, z.ZodObject<{
                description: z.ZodOptional<z.ZodString>;
                stats: z.ZodObject<{
                    queries: z.ZodNumber;
                    errors: z.ZodNumber;
                    totalSpend: z.ZodNumber;
                    totalCreditSpend: z.ZodNumber;
                    averageBytesPerQuery: z.ZodNumber;
                    maxBytesPerQuery: z.ZodNumber;
                    averageMilliseconds: z.ZodNumber;
                    maxMilliseconds: z.ZodNumber;
                    averageTotalPricePerQuery: z.ZodNumber;
                    maxPricePerQuery: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                }, {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                }>;
                netBasePrice: z.ZodNumber;
                schemaAsJson: z.ZodOptional<z.ZodAny>;
                priceBreakdown: z.ZodArray<z.ZodObject<{
                    basePrice: z.ZodNumber;
                    addOns: z.ZodOptional<z.ZodObject<{
                        perKb: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        perKb?: number | undefined;
                    }, {
                        perKb?: number | undefined;
                    }>>;
                    remoteMeta: z.ZodOptional<z.ZodObject<{
                        host: z.ZodString;
                        datastoreId: z.ZodString;
                        datastoreVersion: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    }, {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }, {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                netBasePrice: number;
                priceBreakdown: {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }[];
                description?: string | undefined;
                schemaAsJson?: any;
            }, {
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                netBasePrice: number;
                priceBreakdown: {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }[];
                description?: string | undefined;
                schemaAsJson?: any;
            }>>;
            schemaInterface: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            version: string;
            versionTimestamp: number;
            scriptHash: string;
            adminIdentities: string[];
            scriptEntrypoint: string;
            coreVersion: string;
            extractorsByName: Record<string, {
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                netBasePrice: number;
                priceBreakdown: {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }[];
                description?: string | undefined;
                schemaAsJson?: any;
            }>;
            crawlersByName: Record<string, {
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                netBasePrice: number;
                priceBreakdown: {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }[];
                description?: string | undefined;
                schemaAsJson?: any;
            }>;
            tablesByName: Record<string, {
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                netBasePrice: number;
                priceBreakdown: {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }[];
                description?: string | undefined;
                schemaAsJson?: any;
            }>;
            latestVersion: string;
            isStarted: boolean;
            stats: {
                queries: number;
                errors: number;
                totalSpend: number;
                totalCreditSpend: number;
                averageBytesPerQuery: number;
                maxBytesPerQuery: number;
                averageMilliseconds: number;
                maxMilliseconds: number;
                averageTotalPricePerQuery: number;
                maxPricePerQuery: number;
            };
            description?: string | undefined;
            name?: string | undefined;
            domain?: string | undefined;
            storageEngineHost?: string | undefined;
            payment?: {
                notaryId: number;
                address?: string | undefined;
            } | undefined;
            schemaInterface?: string | undefined;
        }, {
            id: string;
            version: string;
            versionTimestamp: number;
            scriptHash: string;
            adminIdentities: string[];
            scriptEntrypoint: string;
            coreVersion: string;
            extractorsByName: Record<string, {
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                netBasePrice: number;
                priceBreakdown: {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }[];
                description?: string | undefined;
                schemaAsJson?: any;
            }>;
            crawlersByName: Record<string, {
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                netBasePrice: number;
                priceBreakdown: {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }[];
                description?: string | undefined;
                schemaAsJson?: any;
            }>;
            tablesByName: Record<string, {
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                netBasePrice: number;
                priceBreakdown: {
                    basePrice: number;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        name: string;
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                    } | undefined;
                }[];
                description?: string | undefined;
                schemaAsJson?: any;
            }>;
            latestVersion: string;
            isStarted: boolean;
            stats: {
                queries: number;
                errors: number;
                totalSpend: number;
                totalCreditSpend: number;
                averageBytesPerQuery: number;
                maxBytesPerQuery: number;
                averageMilliseconds: number;
                maxMilliseconds: number;
                averageTotalPricePerQuery: number;
                maxPricePerQuery: number;
            };
            description?: string | undefined;
            name?: string | undefined;
            domain?: string | undefined;
            storageEngineHost?: string | undefined;
            payment?: {
                notaryId: number;
                address?: string | undefined;
            } | undefined;
            schemaInterface?: string | undefined;
        }>;
    };
    'Datastore.stream': {
        args: z.ZodObject<{
            id: z.ZodString;
            version: z.ZodString;
            payment: z.ZodOptional<z.ZodObject<{
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
            }>>;
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
            queryId: z.ZodString;
            affiliateId: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
            input: z.ZodOptional<z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            version: string;
            name: string;
            queryId: string;
            payment?: {
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
            } | undefined;
            authentication?: {
                identity: string;
                signature: Buffer;
                nonce: string;
            } | undefined;
            affiliateId?: string | undefined;
            input?: any;
        }, {
            id: string;
            version: string;
            name: string;
            queryId: string;
            payment?: {
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
            } | undefined;
            authentication?: {
                identity: string;
                signature: Buffer;
                nonce: string;
            } | undefined;
            affiliateId?: string | undefined;
            input?: any;
        }>;
        result: z.ZodObject<{
            latestVersion: z.ZodString;
            runError: z.ZodOptional<z.ZodType<Error, z.ZodTypeDef, Error>>;
            outputs: z.ZodArray<z.ZodOptional<z.ZodAny>, "many">;
            metadata: z.ZodObject<{
                microgons: z.ZodNumber;
                bytes: z.ZodNumber;
                milliseconds: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                microgons: number;
                bytes: number;
                milliseconds: number;
            }, {
                microgons: number;
                bytes: number;
                milliseconds: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            latestVersion: string;
            outputs: any[];
            metadata: {
                microgons: number;
                bytes: number;
                milliseconds: number;
            };
            runError?: Error | undefined;
        }, {
            latestVersion: string;
            outputs: any[];
            metadata: {
                microgons: number;
                bytes: number;
                milliseconds: number;
            };
            runError?: Error | undefined;
        }>;
    };
    'Datastore.query': {
        args: z.ZodObject<{
            id: z.ZodString;
            version: z.ZodString;
            payment: z.ZodOptional<z.ZodObject<{
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
            }>>;
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
            queryId: z.ZodString;
            affiliateId: z.ZodOptional<z.ZodString>;
            sql: z.ZodString;
            boundValues: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            version: string;
            queryId: string;
            sql: string;
            payment?: {
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
            } | undefined;
            authentication?: {
                identity: string;
                signature: Buffer;
                nonce: string;
            } | undefined;
            affiliateId?: string | undefined;
            boundValues?: any[] | undefined;
        }, {
            id: string;
            version: string;
            queryId: string;
            sql: string;
            payment?: {
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
            } | undefined;
            authentication?: {
                identity: string;
                signature: Buffer;
                nonce: string;
            } | undefined;
            affiliateId?: string | undefined;
            boundValues?: any[] | undefined;
        }>;
        result: z.ZodObject<{
            latestVersion: z.ZodString;
            runError: z.ZodOptional<z.ZodType<Error, z.ZodTypeDef, Error>>;
            outputs: z.ZodArray<z.ZodOptional<z.ZodAny>, "many">;
            metadata: z.ZodObject<{
                microgons: z.ZodNumber;
                bytes: z.ZodNumber;
                milliseconds: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                microgons: number;
                bytes: number;
                milliseconds: number;
            }, {
                microgons: number;
                bytes: number;
                milliseconds: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            latestVersion: string;
            outputs: any[];
            metadata: {
                microgons: number;
                bytes: number;
                milliseconds: number;
            };
            runError?: Error | undefined;
        }, {
            latestVersion: string;
            outputs: any[];
            metadata: {
                microgons: number;
                bytes: number;
                milliseconds: number;
            };
            runError?: Error | undefined;
        }>;
    };
    'Datastore.createStorageEngine': {
        args: z.ZodObject<{
            version: z.ZodObject<{
                compressedDbx: z.ZodType<Buffer, z.ZodTypeDef, Buffer>;
                adminIdentity: z.ZodOptional<z.ZodString>;
                adminSignature: z.ZodOptional<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>>;
            }, "strip", z.ZodTypeAny, {
                compressedDbx: Buffer;
                adminIdentity?: string | undefined;
                adminSignature?: Buffer | undefined;
            }, {
                compressedDbx: Buffer;
                adminIdentity?: string | undefined;
                adminSignature?: Buffer | undefined;
            }>;
            previousVersion: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                compressedDbx: z.ZodType<Buffer, z.ZodTypeDef, Buffer>;
                adminIdentity: z.ZodOptional<z.ZodString>;
                adminSignature: z.ZodOptional<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>>;
            }, "strip", z.ZodTypeAny, {
                compressedDbx: Buffer;
                adminIdentity?: string | undefined;
                adminSignature?: Buffer | undefined;
            }, {
                compressedDbx: Buffer;
                adminIdentity?: string | undefined;
                adminSignature?: Buffer | undefined;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            version: {
                compressedDbx: Buffer;
                adminIdentity?: string | undefined;
                adminSignature?: Buffer | undefined;
            };
            previousVersion?: {
                compressedDbx: Buffer;
                adminIdentity?: string | undefined;
                adminSignature?: Buffer | undefined;
            } | null | undefined;
        }, {
            version: {
                compressedDbx: Buffer;
                adminIdentity?: string | undefined;
                adminSignature?: Buffer | undefined;
            };
            previousVersion?: {
                compressedDbx: Buffer;
                adminIdentity?: string | undefined;
                adminSignature?: Buffer | undefined;
            } | null | undefined;
        }>;
        result: z.ZodObject<{
            success: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            success: boolean;
        }, {
            success: boolean;
        }>;
    };
    'Datastore.queryStorageEngine': {
        args: z.ZodObject<{
            id: z.ZodString;
            version: z.ZodString;
            payment: z.ZodOptional<z.ZodObject<{
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
            }>>;
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
            queryId: z.ZodString;
            affiliateId: z.ZodOptional<z.ZodString>;
            sql: z.ZodString;
            boundValues: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
            virtualEntitiesByName: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
                parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                records: z.ZodArray<z.ZodAny, "many">;
            }, "strip", z.ZodTypeAny, {
                records: any[];
                parameters?: Record<string, any> | undefined;
            }, {
                records: any[];
                parameters?: Record<string, any> | undefined;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            version: string;
            queryId: string;
            sql: string;
            payment?: {
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
            } | undefined;
            authentication?: {
                identity: string;
                signature: Buffer;
                nonce: string;
            } | undefined;
            affiliateId?: string | undefined;
            boundValues?: any[] | undefined;
            virtualEntitiesByName?: Record<string, {
                records: any[];
                parameters?: Record<string, any> | undefined;
            }> | undefined;
        }, {
            id: string;
            version: string;
            queryId: string;
            sql: string;
            payment?: {
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
            } | undefined;
            authentication?: {
                identity: string;
                signature: Buffer;
                nonce: string;
            } | undefined;
            affiliateId?: string | undefined;
            boundValues?: any[] | undefined;
            virtualEntitiesByName?: Record<string, {
                records: any[];
                parameters?: Record<string, any> | undefined;
            }> | undefined;
        }>;
        result: z.ZodObject<{
            latestVersion: z.ZodString;
            runError: z.ZodOptional<z.ZodType<Error, z.ZodTypeDef, Error>>;
            outputs: z.ZodArray<z.ZodOptional<z.ZodAny>, "many">;
            metadata: z.ZodObject<{
                microgons: z.ZodNumber;
                bytes: z.ZodNumber;
                milliseconds: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                microgons: number;
                bytes: number;
                milliseconds: number;
            }, {
                microgons: number;
                bytes: number;
                milliseconds: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            latestVersion: string;
            outputs: any[];
            metadata: {
                microgons: number;
                bytes: number;
                milliseconds: number;
            };
            runError?: Error | undefined;
        }, {
            latestVersion: string;
            outputs: any[];
            metadata: {
                microgons: number;
                bytes: number;
                milliseconds: number;
            };
            runError?: Error | undefined;
        }>;
    };
    'Datastores.list': {
        args: z.ZodObject<{
            offset: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            offset: number;
        }, {
            offset?: number | undefined;
        }>;
        result: z.ZodObject<{
            datastores: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                version: z.ZodString;
                versionTimestamp: z.ZodNumber;
                name: z.ZodOptional<z.ZodString>;
                description: z.ZodOptional<z.ZodString>;
                domain: z.ZodOptional<z.ZodString>;
                isStarted: z.ZodBoolean;
                scriptEntrypoint: z.ZodString;
                stats: z.ZodObject<{
                    queries: z.ZodNumber;
                    errors: z.ZodNumber;
                    totalSpend: z.ZodNumber;
                    totalCreditSpend: z.ZodNumber;
                    averageBytesPerQuery: z.ZodNumber;
                    maxBytesPerQuery: z.ZodNumber;
                    averageMilliseconds: z.ZodNumber;
                    maxMilliseconds: z.ZodNumber;
                    averageTotalPricePerQuery: z.ZodNumber;
                    maxPricePerQuery: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                }, {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                }>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                version: string;
                versionTimestamp: number;
                scriptEntrypoint: string;
                isStarted: boolean;
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                name?: string | undefined;
                description?: string | undefined;
                domain?: string | undefined;
            }, {
                id: string;
                version: string;
                versionTimestamp: number;
                scriptEntrypoint: string;
                isStarted: boolean;
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                name?: string | undefined;
                description?: string | undefined;
                domain?: string | undefined;
            }>, "many">;
            total: z.ZodNumber;
            offset: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            offset: number;
            datastores: {
                id: string;
                version: string;
                versionTimestamp: number;
                scriptEntrypoint: string;
                isStarted: boolean;
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                name?: string | undefined;
                description?: string | undefined;
                domain?: string | undefined;
            }[];
            total: number;
        }, {
            offset: number;
            datastores: {
                id: string;
                version: string;
                versionTimestamp: number;
                scriptEntrypoint: string;
                isStarted: boolean;
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
                name?: string | undefined;
                description?: string | undefined;
                domain?: string | undefined;
            }[];
            total: number;
        }>;
    };
    'Datastore.versions': {
        args: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        result: z.ZodObject<{
            versions: z.ZodArray<z.ZodObject<{
                version: z.ZodString;
                timestamp: z.ZodEffects<z.ZodNumber, number, number>;
            }, "strip", z.ZodTypeAny, {
                version: string;
                timestamp: number;
            }, {
                version: string;
                timestamp: number;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            versions: {
                version: string;
                timestamp: number;
            }[];
        }, {
            versions: {
                version: string;
                timestamp: number;
            }[];
        }>;
    };
    'Datastore.stats': {
        args: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        result: z.ZodObject<{
            byVersion: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodEnum<["Table", "Extractor", "Crawler"]>;
                stats: z.ZodObject<{
                    queries: z.ZodNumber;
                    errors: z.ZodNumber;
                    totalSpend: z.ZodNumber;
                    totalCreditSpend: z.ZodNumber;
                    averageBytesPerQuery: z.ZodNumber;
                    maxBytesPerQuery: z.ZodNumber;
                    averageMilliseconds: z.ZodNumber;
                    maxMilliseconds: z.ZodNumber;
                    averageTotalPricePerQuery: z.ZodNumber;
                    maxPricePerQuery: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                }, {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                }>;
            }, "strip", z.ZodTypeAny, {
                type: "Table" | "Extractor" | "Crawler";
                name: string;
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
            }, {
                type: "Table" | "Extractor" | "Crawler";
                name: string;
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
            }>, "many">;
            overall: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodEnum<["Table", "Extractor", "Crawler"]>;
                stats: z.ZodObject<{
                    queries: z.ZodNumber;
                    errors: z.ZodNumber;
                    totalSpend: z.ZodNumber;
                    totalCreditSpend: z.ZodNumber;
                    averageBytesPerQuery: z.ZodNumber;
                    maxBytesPerQuery: z.ZodNumber;
                    averageMilliseconds: z.ZodNumber;
                    maxMilliseconds: z.ZodNumber;
                    averageTotalPricePerQuery: z.ZodNumber;
                    maxPricePerQuery: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                }, {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                }>;
            }, "strip", z.ZodTypeAny, {
                type: "Table" | "Extractor" | "Crawler";
                name: string;
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
            }, {
                type: "Table" | "Extractor" | "Crawler";
                name: string;
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            byVersion: {
                type: "Table" | "Extractor" | "Crawler";
                name: string;
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
            }[];
            overall: {
                type: "Table" | "Extractor" | "Crawler";
                name: string;
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
            }[];
        }, {
            byVersion: {
                type: "Table" | "Extractor" | "Crawler";
                name: string;
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
            }[];
            overall: {
                type: "Table" | "Extractor" | "Crawler";
                name: string;
                stats: {
                    queries: number;
                    errors: number;
                    totalSpend: number;
                    totalCreditSpend: number;
                    averageBytesPerQuery: number;
                    maxBytesPerQuery: number;
                    averageMilliseconds: number;
                    maxMilliseconds: number;
                    averageTotalPricePerQuery: number;
                    maxPricePerQuery: number;
                };
            }[];
        }>;
    };
};
type IDatastoreApiTypes = IZodSchemaToApiTypes<typeof DatastoreApiSchemas>;
export type IDatastoreEntityStats = z.infer<typeof EntityStatsSchema>;
export type IDatastoreQueryMetadata = z.infer<typeof DatastoreQueryMetadataSchema>;
export type IDatastoreMetadataResult = z.infer<typeof DatastoreMetadataResult>;
export type IDatastoreQueryResult = z.infer<typeof DatastoreQueryResultSchema>;
export default IDatastoreApiTypes;
