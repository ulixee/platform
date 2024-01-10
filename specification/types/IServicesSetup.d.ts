import { z } from '@ulixee/specification';
export declare const ServicesSetupSchema: z.ZodObject<{
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
declare type IServicesSetup = z.infer<typeof ServicesSetupSchema>;
export default IServicesSetup;
