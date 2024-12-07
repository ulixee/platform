import DocspageDir from '@ulixee/datastore-docpage';
import IDatastoreApiTypes from '@ulixee/platform-specification/datastore/DatastoreApis';
import { datastoreRegex } from '@ulixee/platform-specification/types/datastoreIdValidation';
import { semverRegex } from '@ulixee/platform-specification/types/semverValidation';
import { createReadStream } from 'fs';
import { IncomingMessage, ServerResponse } from 'http';
import createStaticFileHandler from '@ulixee/platform-utils/lib/staticServe';
import DatastoreRegistry from '../lib/DatastoreRegistry';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';

export const datastorePathRegex = new RegExp(
  `/(${datastoreRegex.source})@v(${semverRegex.source})(/(.+)?)?`,
);

export default class DocpageRoutes {
  private staticServe: (req: IncomingMessage, res: ServerResponse) => Promise<any>;

  constructor(
    private datastoreRegistry: DatastoreRegistry,
    private serverAddress: URL,
    private getCredits: (
      args: IDatastoreApiTypes['Datastore.creditsBalance']['args'],
    ) => Promise<any>,
    private cacheTime = 3600,
  ) {
    this.staticServe = createStaticFileHandler(DocspageDir, this.cacheTime);
  }

  public async routeCreditsBalanceApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    if (req.headers.accept !== 'application/json') return false;
    let version = '';
    let datastoreId = '';

    let host = req.headers.host ?? this.serverAddress.host;
    if (!host.includes('://')) host = `http://${host}`;
    const url = new URL(req.url, host);

    if (!version) {
      const match = url.pathname.match(datastorePathRegex);
      datastoreId = match[1];
      version = match[2];
    }
    if (!version) {
      res.writeHead(409, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'No valid Datastore version could be found.' }));
    }

    const creditId = url.searchParams.keys().next().value.split(':').shift();
    const result = await this.getCredits({ id: datastoreId, version, creditId });

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(TypeSerializer.stringify(result));
    return true;
  }

  public async routeHttp(
    req: IncomingMessage,
    res: ServerResponse,
    params: string[],
  ): Promise<boolean> {
    if (!params[2]) {
      const url = new URL(req.url, 'http://localhost/');
      url.pathname += '/';
      const search = url.search !== '?' ? url.search : '';
      res.writeHead(301, { location: `${url.pathname}${search}` });
      res.end();
      return true;
    }

    if (req.url.includes('docpage.json')) {
      const datastoreId = params[0];
      const version = params[1];
      const { runtimePath } = await this.datastoreRegistry.get(datastoreId, version);
      const docpagePath = runtimePath.replace('datastore.js', 'docpage.json');
      res.writeHead(200, { 'content-type': 'application/json' });
      createReadStream(docpagePath, { autoClose: true }).pipe(res, { end: true });
      return true;
    }

    if (params[2].startsWith('/assets/') || params[2] === '/favicon.ico') {
      req.url = params[2];
    } else {
      req.url = '/';
    }
    await this.staticServe(req, res);
    return true;
  }
}
