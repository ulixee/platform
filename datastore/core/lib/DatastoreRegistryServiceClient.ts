import { toUrl } from '@ulixee/commons/lib/utils';
import { ConnectionToCore } from '@ulixee/net';
import { IDatastoreRegistryApis } from '@ulixee/platform-specification/services/DatastoreRegistryApis';
import IDatastoreRegistryStore, {
  IDatastoreManifestWithLatest,
} from '../interfaces/IDatastoreRegistryStore';
import { TDatastoreUpload } from './DatastoreRegistry';

export default class DatastoreRegistryServiceClient implements IDatastoreRegistryStore {
  public source = 'cluster' as const;
  public hostAddress: URL;

  constructor(public client: ConnectionToCore<IDatastoreRegistryApis, {}>) {
    this.hostAddress = toUrl(client.transport.host);
  }

  async close(): Promise<void> {
    return Promise.resolve();
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
