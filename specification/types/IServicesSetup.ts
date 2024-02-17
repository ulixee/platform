import { z } from 'zod';

export const ServicesSetupSchema = z.object({
  datastoreRegistryHost: z.string().url().optional(),
  storageEngineHost: z.string().url().optional(),
  statsTrackerHost: z.string().url().optional(),
  nodeRegistryHost: z.string().url().optional(),
  replayRegistryHost: z.string().url().optional(),
});

type IServicesSetup = z.infer<typeof ServicesSetupSchema>;
export default IServicesSetup;
