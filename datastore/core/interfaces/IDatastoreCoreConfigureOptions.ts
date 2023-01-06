import { IBlockSettings } from '@ulixee/specification';
import Identity from '@ulixee/crypto/lib/Identity';

export default interface IDatastoreCoreConfigureOptions {
  serverEnvironment: 'development' | 'production';
  maxRuntimeMs: number;
  datastoresDir: string;
  datastoresTmpDir: string;
  waitForDatastoreCompletionOnShutdown: boolean;
  paymentAddress: string;
  giftCardsAllowed: boolean;
  giftCardsRequiredIssuerIdentity: string;
  enableRunWithLocalPath: boolean;
  uploaderIdentities: string[];
  defaultBytesForPaymentEstimates: number;
  computePricePerQuery: number;
  approvedSidechains: IBlockSettings['sidechains'];
  approvedSidechainsRefreshInterval: number;
  defaultSidechainHost: string;
  defaultSidechainRootIdentity: string;
  identityWithSidechain: Identity;
}
