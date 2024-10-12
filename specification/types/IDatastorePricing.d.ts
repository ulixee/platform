import { z } from 'zod';
export declare const DatastorePricing: z.ZodObject<{
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
        datastoreId: string;
        name: string;
        host: string;
        datastoreVersion: string;
    }, {
        datastoreId: string;
        name: string;
        host: string;
        datastoreVersion: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    basePrice: number;
    addOns?: {
        perKb?: number | undefined;
    } | undefined;
    remoteMeta?: {
        datastoreId: string;
        name: string;
        host: string;
        datastoreVersion: string;
    } | undefined;
}, {
    basePrice: number;
    addOns?: {
        perKb?: number | undefined;
    } | undefined;
    remoteMeta?: {
        datastoreId: string;
        name: string;
        host: string;
        datastoreVersion: string;
    } | undefined;
}>;
type IDatastorePricing = z.infer<typeof DatastorePricing>;
export default IDatastorePricing;
