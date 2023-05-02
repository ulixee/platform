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
    if (!host.includes('://')) host = `ulx://${host}`;
    const url = new URL(host);
    host = `ulx://${url.host}`;
    this.apiClientCacheByUrl[host] ??= new DatastoreApiClient(host);
    return this.apiClientCacheByUrl[host];
  }
}
