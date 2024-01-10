import { z } from '@ulixee/specification';
import { IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
export declare const CloudApiSchemas: {
    'Cloud.status': {
        args: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
        result: z.ZodObject<{
            version: z.ZodString;
            nodes: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            version: string;
            nodes: number;
        }, {
            version: string;
            nodes: number;
        }>;
    };
};
declare type ICloudApiTypes = IZodSchemaToApiTypes<typeof CloudApiSchemas>;
export default ICloudApiTypes;
