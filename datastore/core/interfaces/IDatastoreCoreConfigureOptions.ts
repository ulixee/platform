import { IBlockSettings } from '@ulixee/specification';
import Identity from '@ulixee/crypto/lib/Identity';

export default interface IDatastoreCoreConfigureOptions {
  serverEnvironment: 'development' | 'production';
  maxRuntimeMs: number;
  datastoresDir: string;
  datastoresTmpDir: string;
  waitForDatastoreCompletionOnShutdown: boolean;
  paymentAddress: string;
  enableDatastoreWatchMode: boolean;
  cloudAdminIdentities: string[];
  requireDatastoreAdminIdentities: boolean;
  defaultBytesForPaymentEstimates: number;
  computePricePerQuery: number;
  approvedSidechains: IBlockSettings['sidechains'];
  approvedSidechainsRefreshInterval: number;
  defaultSidechainHost: string;
  defaultSidechainRootIdentity: string;
  identityWithSidechain: Identity;
}
