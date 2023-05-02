import { IncomingMessage, ServerResponse } from 'http';
import { createReadStream } from 'fs';
import DocspageDir from '@ulixee/datastore-docpage';
import DatastoreRegistry from './DatastoreRegistry';
import createStaticFileHandler from './staticServe';

export default class ServeDocPages {
  private staticServe: (req: IncomingMessage, res: ServerResponse) => Promise<any>;

  constructor(
    private datastoreRegistry: DatastoreRegistry,
    private serverAddress: URL,
    private getCredits: (args: { datastoreVersionHash: string; creditId: string }) => Promise<any>,
    private cacheTime = 3600,
  ) {
    this.staticServe = createStaticFileHandler(DocspageDir, this.cacheTime);
  }

  public async routeCreditsBalanceApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    if (req.headers.accept !== 'application/json') return false;
    let datastoreVersionHash = '';

    let host = req.headers.host ?? this.serverAddress.host;
    if (!host.includes('://')) host = `http://${host}`;
    const url = new URL(req.url, host);

    if (!url.host.includes('localhost')) {
      const domainVersion = await this.datastoreRegistry.getByDomain(url.hostname);
      datastoreVersionHash = domainVersion?.versionHash;
    }
    if (!datastoreVersionHash) {
      const match = url.pathname.match(/(dbx1[ac-hj-np-z02-9]{18})(\/(.+)?)?/);
      datastoreVersionHash = match[1];
    }
    if (!datastoreVersionHash) {
      res.writeHead(409, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'No valid Datastore VersionHash could be found.' }));
    }

    const creditId = url.searchParams.keys().next().value.split(':').shift();
    const result = await this.getCredits({ datastoreVersionHash, creditId });

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(result));
    return true;
  }

  public async routeHttpRoot(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const host = req.headers.host.replace(`:${this.serverAddress.port}`, '').split('://').pop();

    const domainVersion = await this.datastoreRegistry.getByDomain(host);
    if (!domainVersion) return false;

    const params = [domainVersion.versionHash];
    if (req.url.length) params.push(req.url);
    await this.routeHttp(req, res, params);
  }

  public async routeHttp(
    req: IncomingMessage,
    res: ServerResponse,
    params: string[],
  ): Promise<void> {
    if (!params[1]) {
      const url = new URL(req.url, 'http://localhost/');
      url.pathname += '/';
      const search = url.search !== '?' ? url.search : '';
      res.writeHead(301, { location: `${url.pathname}${search}` });
      res.end();
      return;
    }

    if (req.url.includes('docpage.json')) {
      const versionHash = params[0];
      const { entrypointPath } = await this.datastoreRegistry.getByVersionHash(versionHash);
      const docpagePath = entrypointPath.replace('datastore.js', 'docpage.json');
      res.writeHead(200, { 'content-type': 'application/json' });
      createReadStream(docpagePath, { autoClose: true }).pipe(res, { end: true });
      return;
    }

    if (
      params[1].startsWith('/js/') ||
      params[1].startsWith('/css/') ||
      params[1].startsWith('/img/') ||
      params[1] === '/favicon.ico'
    ) {
      req.url = params[1];
    } else {
      req.url = '/';
    }
    await this.staticServe(req, res);
  }
}
