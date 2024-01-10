import { z } from '@ulixee/specification';
export declare const ArgonFileSchema: z.ZodObject<{
    credit: z.ZodOptional<z.ZodObject<{
        datastoreUrl: z.ZodString;
        microgons: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        microgons: number;
        datastoreUrl: string;
    }, {
        microgons: number;
        datastoreUrl: string;
    }>>;
    cash: z.ZodOptional<z.ZodObject<{
        centagons: z.ZodBigInt;
        toAddress: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        centagons: bigint;
        toAddress?: string | undefined;
    }, {
        centagons: bigint;
        toAddress?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    credit?: {
        microgons: number;
        datastoreUrl: string;
    } | undefined;
    cash?: {
        centagons: bigint;
        toAddress?: string | undefined;
    } | undefined;
}, {
    credit?: {
        microgons: number;
        datastoreUrl: string;
    } | undefined;
    cash?: {
        centagons: bigint;
        toAddress?: string | undefined;
    } | undefined;
}>;
declare type IArgonFile = z.infer<typeof ArgonFileSchema>;
export default IArgonFile;
