import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import { IDatastoreRegistryApis } from '@ulixee/platform-specification/services/DatastoreRegistryApis';
import IDatastoreRegistryStore, {
  IDatastoreManifestWithLatest,
} from '../interfaces/IDatastoreRegistryStore';
import { TDatastoreUpload } from './DatastoreRegistry';

export default class DatastoreRegistryClusterStore implements IDatastoreRegistryStore {
  public source = 'cluster' as const;

  client: ConnectionToCore<IDatastoreRegistryApis, {}>;
  hostAddress: URL;

  constructor(hostAddress: URL) {
    this.hostAddress = new URL('/services', hostAddress);
    this.client = new ConnectionToCore(new WsTransportToCore(this.hostAddress.href));
  }

  async close(): Promise<void> {
    await this.client.disconnect();
  }

  async all(count?: number, offset?: number): Promise<IDatastoreManifestWithLatest[]> {
    const result = await this.client.sendRequest({
      command: 'DatastoreRegistry.list',
      args: [{ count, offset }],
    });
    return result.datastores;
  }

  async get(versionHash: string): Promise<IDatastoreManifestWithLatest> {
    const result = await this.client.sendRequest({
      command: 'DatastoreRegistry.get',
      args: [{ versionHash }],
    });
    return result.datastore;
  }

  async getLatestVersion(versionHash: string): Promise<string> {
    return (
      await this.client.sendRequest({
        command: 'DatastoreRegistry.getLatestVersion',
        args: [{ versionHash }],
      })
    ).latestVersionHash;
  }

  async getPreviousInstalledVersion(versionHash: string): Promise<string> {
    return (
      await this.client.sendRequest({
        command: 'DatastoreRegistry.getPreviousInstalledVersion',
        args: [{ versionHash }],
      })
    ).previousVersionHash;
  }

  async getLatestVersionForDomain(domain: string): Promise<string> {
    return (
      await this.client.sendRequest({
        command: 'DatastoreRegistry.getLatestVersionForDomain',
        args: [{ domain }],
      })
    ).latestVersionHash;
  }

  async downloadDbx(versionHash: string): ReturnType<IDatastoreRegistryStore['downloadDbx']> {
    const { adminIdentity, adminSignature, compressedDbx } = await this.client.sendRequest({
      command: 'DatastoreRegistry.downloadDbx',
      args: [{ versionHash }],
    });
    return {
      compressedDbx,
      adminIdentity,
      adminSignature,
      ulixeeApiHost: this.client.transport.host,
    };
  }

  async upload(datastore: TDatastoreUpload): Promise<{ success: boolean }> {
    return await this.client.sendRequest({
      command: 'DatastoreRegistry.upload',
      args: [datastore],
    });
  }
}
