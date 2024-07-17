import { z } from 'zod';
export declare const DatastoreStatsSchema: z.ZodObject<{
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
type IDatastoreStats = z.infer<typeof DatastoreStatsSchema>;
export default IDatastoreStats;
