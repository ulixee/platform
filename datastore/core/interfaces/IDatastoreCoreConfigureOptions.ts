import { ILocalchainConfig } from '../lib/LocalchainWithSync';

export default interface IDatastoreCoreConfigureOptions {
  serverEnvironment: 'development' | 'production';
  maxRuntimeMs: number;
  datastoresDir: string;
  queryHeroSessionsDir: string;
  datastoresTmpDir: string;
  waitForDatastoreCompletionOnShutdown: boolean;
  enableDatastoreWatchMode: boolean;
  cloudAdminIdentities: string[];
  datastoresMustHaveOwnAdminIdentity: boolean;

  localchainConfig?: ILocalchainConfig;
  // services settings
  datastoreRegistryHost: string | 'self';
  storageEngineHost: string | 'self';
  statsTrackerHost: string | 'self';
  replayRegistryHost: string | 'self';
  escrowSpendTrackingHost: string | 'self';
  paymentServiceHost: string | 'self';
  datastoreLookupHost: string | 'self';
}
