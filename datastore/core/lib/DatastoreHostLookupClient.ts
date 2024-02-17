import IDatastoreHostLookup, { IDatastoreHost } from '@ulixee/datastore/interfaces/IDatastoreHostLookup';
import { ConnectionToCore } from '@ulixee/net';
import { IDomainLookupApis } from '@ulixee/platform-specification/datastore';

export default class DatastoreHostLookupClient implements IDatastoreHostLookup {
  constructor(readonly serviceClient: ConnectionToCore<IDomainLookupApis, {}>) {}

  public async getHostInfo(datastoreUrl: string): Promise<IDatastoreHost> {
    return this.serviceClient.sendRequest({
      command: 'DomainLookup.query',
      args: [{ datastoreUrl }],
    });
  }
}
