import { z } from '@ulixee/specification';
import { IZodHandlers, IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
export declare const ServicesSetupApiSchemas: {
    'Services.getSetup': {
        args: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
        result: z.ZodObject<{
            datastoreRegistryHost: z.ZodOptional<z.ZodString>;
            storageEngineHost: z.ZodOptional<z.ZodString>;
            statsTrackerHost: z.ZodOptional<z.ZodString>;
            nodeRegistryHost: z.ZodOptional<z.ZodString>;
            replayRegistryHost: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            datastoreRegistryHost?: string | undefined;
            storageEngineHost?: string | undefined;
            statsTrackerHost?: string | undefined;
            nodeRegistryHost?: string | undefined;
            replayRegistryHost?: string | undefined;
        }, {
            datastoreRegistryHost?: string | undefined;
            storageEngineHost?: string | undefined;
            statsTrackerHost?: string | undefined;
            nodeRegistryHost?: string | undefined;
            replayRegistryHost?: string | undefined;
        }>;
    };
};
export declare type IServicesSetupApiTypes = IZodSchemaToApiTypes<typeof ServicesSetupApiSchemas>;
export declare type IServicesSetupApis<TContext = any> = IZodHandlers<typeof ServicesSetupApiSchemas, TContext>;
export default IServicesSetupApiTypes;
