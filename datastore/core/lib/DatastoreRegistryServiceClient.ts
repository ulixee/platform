import { toUrl } from '@ulixee/commons/lib/utils';
import { ConnectionToCore } from '@ulixee/net';
import {
  IDatastoreListEntry,
  IDatastoreRegistryApis,
} from '@ulixee/platform-specification/services/DatastoreRegistryApis';
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

  async list(
    count?: number,
    offset?: number,
  ): Promise<{ datastores: IDatastoreListEntry[]; total: number }> {
    const result = await this.client.sendRequest({
      command: 'DatastoreRegistry.list',
      args: [{ count, offset }],
    });
    return {
      datastores: result.datastores,
      total: result.total,
    };
  }

  public async getVersions(
    id: string,
  ): Promise<{ version: string; timestamp: number }[]> {
    const result = await this.client.sendRequest({
      command: 'DatastoreRegistry.getVersions',
      args: [{ id }],
    });
    return result.versions;
  }

  async get(id: string, version: string): Promise<IDatastoreManifestWithLatest> {
    const result = await this.client.sendRequest({
      command: 'DatastoreRegistry.get',
      args: [{ id, version }],
    });
    return result.datastore;
  }

  async getLatestVersion(id: string): Promise<string> {
    return (
      await this.client.sendRequest({
        command: 'DatastoreRegistry.getLatestVersion',
        args: [{ id }],
      })
    )?.latestVersion;
  }

  async downloadDbx(
    id: string,
    version: string,
  ): ReturnType<IDatastoreRegistryStore['downloadDbx']> {
    const { adminIdentity, adminSignature, compressedDbx } = await this.client.sendRequest({
      command: 'DatastoreRegistry.downloadDbx',
      args: [{ id, version }],
    });
    return {
      compressedDbx,
      adminIdentity,
      adminSignature,
      apiHost: this.client.transport.host,
    };
  }

  async upload(datastore: TDatastoreUpload): Promise<{ success: boolean }> {
    return await this.client.sendRequest({
      command: 'DatastoreRegistry.upload',
      args: [datastore],
    });
  }
}
