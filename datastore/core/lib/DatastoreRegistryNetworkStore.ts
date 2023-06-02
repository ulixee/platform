import { sha256 } from '@ulixee/commons/lib/hashUtils';
import { IPayment } from '@ulixee/platform-specification';
import IKad from '@ulixee/platform-specification/types/IKad';
import IDatastoreRegistryStore, {
  IDatastoreManifestWithLatest,
} from '../interfaces/IDatastoreRegistryStore';
import DatastoreApiClients from './DatastoreApiClients';
import { DatastoreNotFoundError } from './errors';

export default class DatastoreRegistryNetworkStore implements IDatastoreRegistryStore {
  public source = 'network' as const;
  private recentFoundVersionsToHost: { [versionHash: string]: string } = {};

  constructor(readonly kad: IKad, readonly datastoreApiClients: DatastoreApiClients) {}

  async close(): Promise<void> {
    return Promise.resolve();
  }

  async get(versionHash: string): Promise<IDatastoreManifestWithLatest> {
    const buffer = DatastoreRegistryNetworkStore.createNetworkKey(versionHash);
    const abort = new AbortController();
    for await (const node of this.kad.findProviderNodes(buffer, {
      abort: abort.signal,
      timeout: 30e3,
    })) {
      if (node.kadHost === this.kad.nodeInfo.kadHost || node.nodeId === this.kad.nodeInfo.nodeId) {
        continue;
      }
      const client = this.datastoreApiClients.get(node.apiHost);
      const result = await client.getMeta(versionHash);
      if (result) {
        this.recentFoundVersionsToHost[versionHash] = node.apiHost;
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
    return { compressedDbx, adminSignature, adminIdentity, apiHost: host };
  }

  async publish(versionHash: string): Promise<void> {
    const key = DatastoreRegistryNetworkStore.createNetworkKey(versionHash);
    return await this.kad.provide(key);
  }

  public static createNetworkKey(versionHash: string): Buffer {
    return sha256(`/datastore/${versionHash}`);
  }
}
