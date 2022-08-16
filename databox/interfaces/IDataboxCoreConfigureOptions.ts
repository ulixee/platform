import { IBlockSettings } from '@ulixee/specification';
import Identity from '@ulixee/crypto/lib/Identity';

export default interface IDataboxCoreConfigureOptions {
  maxRuntimeMs: number;
  databoxesDir: string;
  databoxesTmpDir: string;
  waitForDataboxCompletionOnShutdown: boolean;
  paymentAddress: string;
  giftCardAddress: string;
  enableRunWithLocalPath: boolean;
  uploaderIdentities: string[];
  defaultBytesForPaymentEstimates: number;
  computePricePerKb: number;
  approvedSidechains: IBlockSettings['sidechains'];
  approvedSidechainsRefreshInterval: number;
  defaultSidechainHost: string;
  defaultSidechainRootIdentity: string;
  identityWithSidechain: Identity;
}
