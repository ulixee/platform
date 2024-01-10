import { z } from '@ulixee/specification';
export declare const minDate: number;
export declare const DatastoreManifestSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    storageEngineHost: z.ZodOptional<z.ZodString>;
    versionTimestamp: z.ZodNumber;
    scriptHash: z.ZodString;
    adminIdentities: z.ZodArray<z.ZodString, "many">;
    scriptEntrypoint: z.ZodString;
    coreVersion: z.ZodString;
    schemaInterface: z.ZodOptional<z.ZodString>;
    extractorsByName: z.ZodRecord<z.ZodString, z.ZodObject<{
        description: z.ZodOptional<z.ZodString>;
        corePlugins: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        schemaAsJson: z.ZodOptional<z.ZodObject<{
            input: z.ZodOptional<z.ZodAny>;
            output: z.ZodOptional<z.ZodAny>;
            inputExamples: z.ZodOptional<z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            input?: any;
            output?: any;
            inputExamples?: any;
        }, {
            input?: any;
            output?: any;
            inputExamples?: any;
        }>>;
        prices: z.ZodOptional<z.ZodArray<z.ZodObject<{
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
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        corePlugins?: Record<string, string> | undefined;
        schemaAsJson?: {
            input?: any;
            output?: any;
            inputExamples?: any;
        } | undefined;
        prices?: {
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
        }[] | undefined;
    }, {
        description?: string | undefined;
        corePlugins?: Record<string, string> | undefined;
        schemaAsJson?: {
            input?: any;
            output?: any;
            inputExamples?: any;
        } | undefined;
        prices?: {
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
        }[] | undefined;
    }>>;
    crawlersByName: z.ZodRecord<z.ZodString, z.ZodObject<{
        description: z.ZodOptional<z.ZodString>;
        corePlugins: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        schemaAsJson: z.ZodOptional<z.ZodObject<{
            input: z.ZodOptional<z.ZodAny>;
            output: z.ZodOptional<z.ZodAny>;
            inputExamples: z.ZodOptional<z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            input?: any;
            output?: any;
            inputExamples?: any;
        }, {
            input?: any;
            output?: any;
            inputExamples?: any;
        }>>;
        prices: z.ZodOptional<z.ZodArray<z.ZodObject<{
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
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        corePlugins?: Record<string, string> | undefined;
        schemaAsJson?: {
            input?: any;
            output?: any;
            inputExamples?: any;
        } | undefined;
        prices?: {
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
        }[] | undefined;
    }, {
        description?: string | undefined;
        corePlugins?: Record<string, string> | undefined;
        schemaAsJson?: {
            input?: any;
            output?: any;
            inputExamples?: any;
        } | undefined;
        prices?: {
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
        }[] | undefined;
    }>>;
    tablesByName: z.ZodRecord<z.ZodString, z.ZodObject<{
        description: z.ZodOptional<z.ZodString>;
        schemaAsJson: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        prices: z.ZodOptional<z.ZodArray<z.ZodObject<{
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
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        schemaAsJson?: Record<string, any> | undefined;
        prices?: {
            perQuery: number;
            remoteMeta?: {
                host: string;
                datastoreId: string;
                datastoreVersion: string;
                tableName: string;
            } | undefined;
        }[] | undefined;
    }, {
        description?: string | undefined;
        schemaAsJson?: Record<string, any> | undefined;
        prices?: {
            perQuery: number;
            remoteMeta?: {
                host: string;
                datastoreId: string;
                datastoreVersion: string;
                tableName: string;
            } | undefined;
        }[] | undefined;
    }>>;
    paymentAddress: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    versionTimestamp: number;
    scriptHash: string;
    adminIdentities: string[];
    scriptEntrypoint: string;
    coreVersion: string;
    extractorsByName: Record<string, {
        description?: string | undefined;
        corePlugins?: Record<string, string> | undefined;
        schemaAsJson?: {
            input?: any;
            output?: any;
            inputExamples?: any;
        } | undefined;
        prices?: {
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
        }[] | undefined;
    }>;
    crawlersByName: Record<string, {
        description?: string | undefined;
        corePlugins?: Record<string, string> | undefined;
        schemaAsJson?: {
            input?: any;
            output?: any;
            inputExamples?: any;
        } | undefined;
        prices?: {
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
        }[] | undefined;
    }>;
    tablesByName: Record<string, {
        description?: string | undefined;
        schemaAsJson?: Record<string, any> | undefined;
        prices?: {
            perQuery: number;
            remoteMeta?: {
                host: string;
                datastoreId: string;
                datastoreVersion: string;
                tableName: string;
            } | undefined;
        }[] | undefined;
    }>;
    name?: string | undefined;
    description?: string | undefined;
    storageEngineHost?: string | undefined;
    schemaInterface?: string | undefined;
    paymentAddress?: string | undefined;
}, {
    id: string;
    version: string;
    versionTimestamp: number;
    scriptHash: string;
    adminIdentities: string[];
    scriptEntrypoint: string;
    coreVersion: string;
    extractorsByName: Record<string, {
        description?: string | undefined;
        corePlugins?: Record<string, string> | undefined;
        schemaAsJson?: {
            input?: any;
            output?: any;
            inputExamples?: any;
        } | undefined;
        prices?: {
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
        }[] | undefined;
    }>;
    crawlersByName: Record<string, {
        description?: string | undefined;
        corePlugins?: Record<string, string> | undefined;
        schemaAsJson?: {
            input?: any;
            output?: any;
            inputExamples?: any;
        } | undefined;
        prices?: {
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
        }[] | undefined;
    }>;
    tablesByName: Record<string, {
        description?: string | undefined;
        schemaAsJson?: Record<string, any> | undefined;
        prices?: {
            perQuery: number;
            remoteMeta?: {
                host: string;
                datastoreId: string;
                datastoreVersion: string;
                tableName: string;
            } | undefined;
        }[] | undefined;
    }>;
    name?: string | undefined;
    description?: string | undefined;
    storageEngineHost?: string | undefined;
    schemaInterface?: string | undefined;
    paymentAddress?: string | undefined;
}>;
declare type IDatastoreManifest = z.infer<typeof DatastoreManifestSchema>;
export default IDatastoreManifest;
