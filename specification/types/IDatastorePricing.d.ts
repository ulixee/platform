import { z } from '@ulixee/specification';
export declare const DatastoreExtractorPricing: z.ZodObject<{
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
}>;
export declare const DatastoreCrawlerPricing: z.ZodObject<{
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
}>;
export declare const DatastoreTablePricing: z.ZodObject<{
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
}>;
declare type IDatastoreExtractorPricing = z.infer<typeof DatastoreExtractorPricing>;
declare type IDatastoreCrawlerPricing = z.infer<typeof DatastoreCrawlerPricing>;
export { IDatastoreExtractorPricing, IDatastoreCrawlerPricing };
