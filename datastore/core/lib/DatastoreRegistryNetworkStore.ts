import IPeerNetwork from '@ulixee/platform-specification/types/IPeerNetwork';
import { decodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import { IPayment } from '@ulixee/platform-specification';
import DatastoreApiClients from './DatastoreApiClients';
import IDatastoreRegistryStore, {
  IDatastoreManifestWithLatest,
} from '../interfaces/IDatastoreRegistryStore';
import { DatastoreNotFoundError } from './errors';

export default class DatastoreRegistryNetworkStore implements IDatastoreRegistryStore {
  public source = 'network' as const;
  private recentFoundVersionsToHost: { [versionHash: string]: string } = {};

  constructor(
    readonly peerNetwork: IPeerNetwork,
    readonly datastoreApiClients: DatastoreApiClients,
  ) {}

  async close(): Promise<void> {
    await this.peerNetwork.close();
  }

  async get(versionHash: string): Promise<IDatastoreManifestWithLatest> {
    const buffer = decodeBuffer(versionHash, 'dbx');
    const abort = new AbortController();
    for await (const node of this.peerNetwork.findProviderNodes('datastore', buffer)) {
      const client = this.datastoreApiClients.get(node.ulixeeApiHost);
      const result = await client.getMeta(versionHash);
      if (result) {
        this.recentFoundVersionsToHost[versionHash] = node.ulixeeApiHost;
        abort.abort();
        return result;
      }
    }
  }

  async getLatestVersion(versionHash: string): Promise<string> {
    const datastore = await this.get(versionHash);
    return datastore?.latestVersionHash;
  }

  async downloadDbx(
    versionHash: string,
    payment?: IPayment,
  ): ReturnType<IDatastoreRegistryStore['downloadDbx']> {
    const host = this.recentFoundVersionsToHost[versionHash];
    if (!host)
      throw new DatastoreNotFoundError('Datastore version not recently found in the network.', {
        versionHash,
      });

    delete this.recentFoundVersionsToHost[versionHash];

    const client = this.datastoreApiClients.get(host);
    const { compressedDbx, adminSignature, adminIdentity } = await client.download(versionHash, {
      payment,
    });
    return { compressedDbx, adminSignature, adminIdentity, ulixeeApiHost: host };
  }

  async publish(versionHash: string): Promise<{ providerKey: string }> {
    const buffer = decodeBuffer(versionHash, 'dbx');
    return await this.peerNetwork.provide('datastore', buffer);
  }
}
