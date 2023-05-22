import { toUrl } from '@ulixee/commons/lib/utils';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
/**
 * This is a cache of all the connections to other machines that we keep
 * alive since many connections use repeated access
 */
export default class DatastoreApiClients {
  private apiClientCacheByUrl: { [url: string]: DatastoreApiClient } = {};

  public async close(): Promise<void> {
    for (const client of Object.values(this.apiClientCacheByUrl)) {
      await client.disconnect();
    }
    this.apiClientCacheByUrl = {};
  }

  public get(host: string): DatastoreApiClient {
    const url = toUrl(host);
    host = `ulx://${url.host}`;
    if (!this.apiClientCacheByUrl[host]) {
      const client = new DatastoreApiClient(host);
      this.apiClientCacheByUrl[host] = client;
      client.connectionToCore.once('disconnected', () => {
        if (this.apiClientCacheByUrl[host] === client) {
          delete this.apiClientCacheByUrl[host];
        }
      });
    }

    return this.apiClientCacheByUrl[host];
  }
}
