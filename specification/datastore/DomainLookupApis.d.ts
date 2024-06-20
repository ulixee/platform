import { z } from 'zod';
import { IZodSchemaToApiTypes } from '../utils/IZodApi';
export declare const DomainLookupApiSchema: {
    'DomainLookup.query': {
        args: z.ZodObject<{
            datastoreUrl: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            datastoreUrl: string;
        }, {
            datastoreUrl: string;
        }>;
        result: z.ZodObject<{
            datastoreId: z.ZodString;
            version: z.ZodString;
            host: z.ZodString;
            domain: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            version: string;
            host: string;
            datastoreId: string;
            domain?: string | undefined;
        }, {
            version: string;
            host: string;
            datastoreId: string;
            domain?: string | undefined;
        }>;
    };
};
type IDomainLookupApiTypes = IZodSchemaToApiTypes<typeof DomainLookupApiSchema>;
export default IDomainLookupApiTypes;
