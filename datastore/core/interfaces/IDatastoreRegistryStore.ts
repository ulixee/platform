import { IDatastoreManifestWithLatest } from '@ulixee/platform-specification/services/DatastoreRegistryApis';
import { IPayment } from '@ulixee/platform-specification';

export { IDatastoreManifestWithLatest };

export default interface IDatastoreRegistryStore {
  source: 'network' | 'cluster' | 'disk';
  close(): Promise<void>;
  get(versionHash: string): Promise<IDatastoreManifestWithLatest>;
  getLatestVersion(versionHash: string): Promise<string>;
  getLatestVersionForDomain?(domain: string): Promise<string>;
  downloadDbx?(
    versionHash: string,
    payment?: IPayment,
  ): Promise<{
    compressedDbx: Buffer;
    apiHost: string;
    adminIdentity: string;
    adminSignature: Buffer;
  }>;
}
