import { IncomingMessage, ServerResponse } from 'http';
import { createReadStream } from 'fs';
import DocspageDir from '@ulixee/datastore-docpage';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import IDatastoreDomainResponse from '@ulixee/datastore/interfaces/IDatastoreDomainResponse';
import { isIPv4, isIPv6 } from 'net';
import { toUrl } from '@ulixee/commons/lib/utils';
import DatastoreRegistry from '../lib/DatastoreRegistry';
import createStaticFileHandler from '../lib/staticServe';
import { DatastoreNotFoundError } from '../lib/errors';

export default class DocpageRoutes {
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
      datastoreVersionHash = await this.datastoreRegistry.getByDomain(url.hostname);
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
    const domain = toUrl(req.headers.host).hostname;
    if (isIPv4(domain) || isIPv6(domain)) return false;

    const domainVersion = await this.datastoreRegistry.getByDomain(domain);
    if (!domainVersion) return false;

    const params = [domainVersion];
    if (req.url.length) params.push(req.url);
    return await this.routeHttp(req, res, params);
  }

  public async routeOptionsRoot(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const domain = toUrl(req.headers.host).hostname;
    if (isIPv4(domain) || isIPv6(domain)) return false;

    const domainVersion = await this.datastoreRegistry.getByDomain(domain);
    if (!domainVersion) {
      res.writeHead(404);
      res.end(
        TypeSerializer.stringify(
          new DatastoreNotFoundError(
            `A datastore mapped to the domain ${domain} could not be located.`,
          ),
        ),
      );
    } else {
      res.end(
        TypeSerializer.stringify(<IDatastoreDomainResponse>{
          datastoreVersionHash: domainVersion,
          host: this.serverAddress.host,
        }),
      );
    }
    return true;
  }

  public async routeHttp(
    req: IncomingMessage,
    res: ServerResponse,
    params: string[],
  ): Promise<boolean> {
    if (!params[1]) {
      const url = new URL(req.url, 'http://localhost/');
      url.pathname += '/';
      const search = url.search !== '?' ? url.search : '';
      res.writeHead(301, { location: `${url.pathname}${search}` });
      res.end();
      return true;
    }

    if (req.url.includes('docpage.json')) {
      const versionHash = params[0];
      const { runtimePath } = await this.datastoreRegistry.getByVersionHash(versionHash);
      const docpagePath = runtimePath.replace('datastore.js', 'docpage.json');
      res.writeHead(200, { 'content-type': 'application/json' });
      createReadStream(docpagePath, { autoClose: true }).pipe(res, { end: true });
      return true;
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
    return true;
  }
}
