import { z } from '@ulixee/specification';

export const CloudSettingsSchema = z.object({
  datastoreRegistryEndpoint: z.string().url().optional(),
  storageEngineEndpoint: z.string().url().optional(),
  statsEndpoint: z.string().url().optional(),
  nodeRegistryEndpoint: z.string().url().optional(),
  dhtServices: z
    .object({
      datastoreRegistry: z.any(),
      nodeRegistry: z.any(),
    })
    .optional(),
});

type ICloudSettings = z.infer<typeof CloudSettingsSchema>;
export default ICloudSettings;
