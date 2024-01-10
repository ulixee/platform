/// <reference types="node" />
import { z } from '@ulixee/specification';
import { IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
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
            issuedCredits: number;
            balance: number;
        }, {
            issuedCredits: number;
            balance: number;
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
            storageEngineHost: z.ZodOptional<z.ZodString>;
            versionTimestamp: z.ZodNumber;
            scriptHash: z.ZodString;
            adminIdentities: z.ZodArray<z.ZodString, "many">;
            scriptEntrypoint: z.ZodString;
            coreVersion: z.ZodString;
            paymentAddress: z.ZodOptional<z.ZodString>;
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
                schemaAsJson: z.ZodOptional<z.ZodAny>;
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
                pricePerQuery: z.ZodNumber;
                minimumPrice: z.ZodNumber;
                prices: z.ZodArray<z.ZodObject<{
                    minimum: z.ZodOptional<z.ZodNumber>;
                    perQuery: z.ZodNumber;
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
                        extractorName: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        extractorName: string;
                    }, {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        extractorName: string;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    perQuery: number;
                    minimum?: number | undefined;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        extractorName: string;
                    } | undefined;
                }, {
                    perQuery: number;
                    minimum?: number | undefined;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        extractorName: string;
                    } | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                prices: {
                    perQuery: number;
                    minimum?: number | undefined;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        extractorName: string;
                    } | undefined;
                }[];
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
                pricePerQuery: number;
                minimumPrice: number;
                description?: string | undefined;
                schemaAsJson?: any;
            }, {
                prices: {
                    perQuery: number;
                    minimum?: number | undefined;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        extractorName: string;
                    } | undefined;
                }[];
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
                pricePerQuery: number;
                minimumPrice: number;
                description?: string | undefined;
                schemaAsJson?: any;
            }>>;
            crawlersByName: z.ZodRecord<z.ZodString, z.ZodObject<{
                description: z.ZodOptional<z.ZodString>;
                schemaAsJson: z.ZodOptional<z.ZodAny>;
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
                pricePerQuery: z.ZodNumber;
                minimumPrice: z.ZodNumber;
                prices: z.ZodArray<z.ZodObject<{
                    minimum: z.ZodOptional<z.ZodNumber>;
                    perQuery: z.ZodNumber;
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
                        crawlerName: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        crawlerName: string;
                    }, {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        crawlerName: string;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    perQuery: number;
                    minimum?: number | undefined;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        crawlerName: string;
                    } | undefined;
                }, {
                    perQuery: number;
                    minimum?: number | undefined;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        crawlerName: string;
                    } | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                prices: {
                    perQuery: number;
                    minimum?: number | undefined;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        crawlerName: string;
                    } | undefined;
                }[];
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
                pricePerQuery: number;
                minimumPrice: number;
                description?: string | undefined;
                schemaAsJson?: any;
            }, {
                prices: {
                    perQuery: number;
                    minimum?: number | undefined;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        crawlerName: string;
                    } | undefined;
                }[];
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
                pricePerQuery: number;
                minimumPrice: number;
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
                pricePerQuery: z.ZodNumber;
                prices: z.ZodArray<z.ZodObject<{
                    perQuery: z.ZodNumber;
                    remoteMeta: z.ZodOptional<z.ZodObject<{
                        host: z.ZodString;
                        datastoreId: z.ZodString;
                        datastoreVersion: z.ZodString;
                        tableName: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        tableName: string;
                    }, {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        tableName: string;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    perQuery: number;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        tableName: string;
                    } | undefined;
                }, {
                    perQuery: number;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        tableName: string;
                    } | undefined;
                }>, "many">;
                schemaAsJson: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                prices: {
                    perQuery: number;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        tableName: string;
                    } | undefined;
                }[];
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
                pricePerQuery: number;
                description?: string | undefined;
                schemaAsJson?: any;
            }, {
                prices: {
                    perQuery: number;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        tableName: string;
                    } | undefined;
                }[];
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
                pricePerQuery: number;
                description?: string | undefined;
                schemaAsJson?: any;
            }>>;
            schemaInterface: z.ZodOptional<z.ZodString>;
            computePricePerQuery: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            version: string;
            versionTimestamp: number;
            scriptHash: string;
            adminIdentities: string[];
            scriptEntrypoint: string;
            coreVersion: string;
            extractorsByName: Record<string, {
                prices: {
                    perQuery: number;
                    minimum?: number | undefined;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        extractorName: string;
                    } | undefined;
                }[];
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
                pricePerQuery: number;
                minimumPrice: number;
                description?: string | undefined;
                schemaAsJson?: any;
            }>;
            crawlersByName: Record<string, {
                prices: {
                    perQuery: number;
                    minimum?: number | undefined;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        crawlerName: string;
                    } | undefined;
                }[];
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
                pricePerQuery: number;
                minimumPrice: number;
                description?: string | undefined;
                schemaAsJson?: any;
            }>;
            tablesByName: Record<string, {
                prices: {
                    perQuery: number;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        tableName: string;
                    } | undefined;
                }[];
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
                pricePerQuery: number;
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
            computePricePerQuery: number;
            description?: string | undefined;
            name?: string | undefined;
            storageEngineHost?: string | undefined;
            paymentAddress?: string | undefined;
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
                prices: {
                    perQuery: number;
                    minimum?: number | undefined;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        extractorName: string;
                    } | undefined;
                }[];
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
                pricePerQuery: number;
                minimumPrice: number;
                description?: string | undefined;
                schemaAsJson?: any;
            }>;
            crawlersByName: Record<string, {
                prices: {
                    perQuery: number;
                    minimum?: number | undefined;
                    addOns?: {
                        perKb?: number | undefined;
                    } | undefined;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        crawlerName: string;
                    } | undefined;
                }[];
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
                pricePerQuery: number;
                minimumPrice: number;
                description?: string | undefined;
                schemaAsJson?: any;
            }>;
            tablesByName: Record<string, {
                prices: {
                    perQuery: number;
                    remoteMeta?: {
                        host: string;
                        datastoreId: string;
                        datastoreVersion: string;
                        tableName: string;
                    } | undefined;
                }[];
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
                pricePerQuery: number;
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
            computePricePerQuery: number;
            description?: string | undefined;
            name?: string | undefined;
            storageEngineHost?: string | undefined;
            paymentAddress?: string | undefined;
            schemaInterface?: string | undefined;
        }>;
    };
    'Datastore.stream': {
        args: z.ZodObject<{
            id: z.ZodString;
            version: z.ZodString;
            queryId: z.ZodString;
            name: z.ZodString;
            input: z.ZodOptional<z.ZodAny>;
            payment: z.ZodOptional<z.ZodObject<{
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
            }>>;
            affiliateId: z.ZodOptional<z.ZodString>;
            authentication: z.ZodOptional<z.ZodObject<{
                identity: z.ZodString;
                signature: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
                nonce: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                signature: Buffer;
                nonce: string;
                identity: string;
            }, {
                signature: Buffer;
                nonce: string;
                identity: string;
            }>>;
            pricingPreferences: z.ZodOptional<z.ZodObject<{
                maxComputePricePerQuery: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                maxComputePricePerQuery: number;
            }, {
                maxComputePricePerQuery: number;
            }>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            version: string;
            name: string;
            queryId: string;
            input?: any;
            payment?: {
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
            } | undefined;
            affiliateId?: string | undefined;
            authentication?: {
                signature: Buffer;
                nonce: string;
                identity: string;
            } | undefined;
            pricingPreferences?: {
                maxComputePricePerQuery: number;
            } | undefined;
        }, {
            id: string;
            version: string;
            name: string;
            queryId: string;
            input?: any;
            payment?: {
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
            } | undefined;
            affiliateId?: string | undefined;
            authentication?: {
                signature: Buffer;
                nonce: string;
                identity: string;
            } | undefined;
            pricingPreferences?: {
                maxComputePricePerQuery: number;
            } | undefined;
        }>;
        result: z.ZodObject<{
            latestVersion: z.ZodString;
            metadata: z.ZodOptional<z.ZodObject<{
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
            }>>;
        }, "strip", z.ZodTypeAny, {
            latestVersion: string;
            metadata?: {
                microgons: number;
                bytes: number;
                milliseconds: number;
            } | undefined;
        }, {
            latestVersion: string;
            metadata?: {
                microgons: number;
                bytes: number;
                milliseconds: number;
            } | undefined;
        }>;
    };
    'Datastore.query': {
        args: z.ZodObject<{
            id: z.ZodString;
            version: z.ZodString;
            queryId: z.ZodString;
            sql: z.ZodString;
            boundValues: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
            affiliateId: z.ZodOptional<z.ZodString>;
            payment: z.ZodOptional<z.ZodObject<{
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
            }>>;
            authentication: z.ZodOptional<z.ZodObject<{
                identity: z.ZodString;
                signature: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
                nonce: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                signature: Buffer;
                nonce: string;
                identity: string;
            }, {
                signature: Buffer;
                nonce: string;
                identity: string;
            }>>;
            pricingPreferences: z.ZodOptional<z.ZodObject<{
                maxComputePricePerQuery: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                maxComputePricePerQuery: number;
            }, {
                maxComputePricePerQuery: number;
            }>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            version: string;
            queryId: string;
            sql: string;
            boundValues?: any[] | undefined;
            affiliateId?: string | undefined;
            payment?: {
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
            } | undefined;
            authentication?: {
                signature: Buffer;
                nonce: string;
                identity: string;
            } | undefined;
            pricingPreferences?: {
                maxComputePricePerQuery: number;
            } | undefined;
        }, {
            id: string;
            version: string;
            queryId: string;
            sql: string;
            boundValues?: any[] | undefined;
            affiliateId?: string | undefined;
            payment?: {
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
            } | undefined;
            authentication?: {
                signature: Buffer;
                nonce: string;
                identity: string;
            } | undefined;
            pricingPreferences?: {
                maxComputePricePerQuery: number;
            } | undefined;
        }>;
        result: z.ZodObject<{
            latestVersion: z.ZodString;
            outputs: z.ZodArray<z.ZodAny, "many">;
            metadata: z.ZodOptional<z.ZodObject<{
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
            }>>;
        }, "strip", z.ZodTypeAny, {
            latestVersion: string;
            outputs: any[];
            metadata?: {
                microgons: number;
                bytes: number;
                milliseconds: number;
            } | undefined;
        }, {
            latestVersion: string;
            outputs: any[];
            metadata?: {
                microgons: number;
                bytes: number;
                milliseconds: number;
            } | undefined;
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
            queryId: z.ZodString;
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
            payment: z.ZodOptional<z.ZodObject<{
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
            }>>;
            authentication: z.ZodOptional<z.ZodObject<{
                identity: z.ZodString;
                signature: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
                nonce: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                signature: Buffer;
                nonce: string;
                identity: string;
            }, {
                signature: Buffer;
                nonce: string;
                identity: string;
            }>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            version: string;
            queryId: string;
            sql: string;
            boundValues?: any[] | undefined;
            virtualEntitiesByName?: Record<string, {
                records: any[];
                parameters?: Record<string, any> | undefined;
            }> | undefined;
            payment?: {
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
            } | undefined;
            authentication?: {
                signature: Buffer;
                nonce: string;
                identity: string;
            } | undefined;
        }, {
            id: string;
            version: string;
            queryId: string;
            sql: string;
            boundValues?: any[] | undefined;
            virtualEntitiesByName?: Record<string, {
                records: any[];
                parameters?: Record<string, any> | undefined;
            }> | undefined;
            payment?: {
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
            } | undefined;
            authentication?: {
                signature: Buffer;
                nonce: string;
                identity: string;
            } | undefined;
        }>;
        result: z.ZodObject<{
            outputs: z.ZodArray<z.ZodAny, "many">;
            metadata: z.ZodOptional<z.ZodObject<{
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
            }>>;
        }, "strip", z.ZodTypeAny, {
            outputs: any[];
            metadata?: {
                microgons: number;
                bytes: number;
                milliseconds: number;
            } | undefined;
        }, {
            outputs: any[];
            metadata?: {
                microgons: number;
                bytes: number;
                milliseconds: number;
            } | undefined;
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
declare type IDatastoreApiTypes = IZodSchemaToApiTypes<typeof DatastoreApiSchemas>;
export declare type IDatastoreEntityStats = z.infer<typeof EntityStatsSchema>;
export default IDatastoreApiTypes;
