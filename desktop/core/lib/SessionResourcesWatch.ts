import IResourceSearchResult from '@ulixee/desktop-interfaces/IResourceSearchResult';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import FuseJs from 'fuse.js';
import { ISearchContext } from '@ulixee/desktop-interfaces/ISessionDomSearchResult';
import IResourceMeta from '@ulixee/unblocked-specification/agent/net/IResourceMeta';
import IResourceType from '@ulixee/unblocked-specification/agent/net/IResourceType';
import SessionDb from '@ulixee/hero-core/dbs/SessionDb';
import IHttpHeaders from '@ulixee/unblocked-specification/agent/net/IHttpHeaders';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import IResourceOverview from '@ulixee/desktop-interfaces/IResourceOverview';

const Fuse = require('fuse.js/dist/fuse.common.js');

export default class SessionResourcesWatch extends TypedEventEmitter<{
  resource: { resource: IResourceOverview };
}> {
  private static searchResourceTypes = new Set<IResourceType>([
    'Document',
    'XHR',
    'Fetch',
    'Script',
    'Websocket',
    'Other',
  ]);

  public resourcesById: { [id: number]: IResourceOverview } = {};

  private searchIndexByTabId: {
    [tabId: number]: FuseJs<{ id: number; body: string; url: string }>;
  } = {};

  constructor(private db: SessionDb, private events: EventSubscriber) {
    super();
  }

  public close(): void {
    this.events.close();
  }

  public search(query: string, context?: ISearchContext): IResourceSearchResult[] {
    const { tabId, documentUrl, startTime, endTime } = context;
    const results: IResourceSearchResult[] = [];

    const finalQuery: string = query
      .split(/\s+/)
      .map(x => {
        if (!x) return null;
        if (x.match(/['^!.]+/)) return `'"${x}"`;
        return `'${x.trim()}`;
      })
      .filter(Boolean)
      .join(' | ');

    const searchResults = this.searchIndexByTabId[tabId].search(finalQuery, { limit: 10 });
    for (const result of searchResults) {
      const resource = this.db.resources.get(result.item.id);
      // must match document url
      if (documentUrl && resource.documentUrl !== documentUrl) continue;
      // allow an exception for the actual document
      const isPageLoad = resource.requestUrl === documentUrl;
      const timestamp = resource.browserLoadedTimestamp ?? resource.responseTimestamp;
      if (!isPageLoad && (timestamp < startTime || timestamp > endTime)) continue;

      const matchIndices: IResourceSearchResult['matchIndices'] = [];
      for (const match of result.matches) {
        if (match.key !== 'body') continue;
        for (const [start, end] of match.indices) {
          matchIndices.push([start, end]);
          if (matchIndices.length > 10) break;
        }
      }

      results.push({
        id: resource.id,
        documentUrl: resource.documentUrl,
        statusCode: resource.statusCode,
        url: resource.requestUrl,
        body: result.item.body,
        type: resource.type,
        matchIndices,
      });
    }
    return results;
  }

  public async onTabResource(tabId: number, resource: IResourceMeta): Promise<void> {
    this.searchIndexByTabId[tabId] ??= new Fuse([], {
      isCaseSensitive: false,
      findAllMatches: true,
      useExtendedSearch: true,
      minMatchCharLength: 3,
      keys: ['body', 'url'],
      ignoreLocation: true,
      ignoreFieldNorm: true,
      includeMatches: true,
    });

    const resourcesRecord = this.db.resources.get(resource.id);
    this.resourcesById[resource.id] = {
      id: resource.id,
      frameId: resource.frameId,
      tabId: resource.tabId,
      type: resource.type,
      method: resource.request.method,
      url: resource.request.url,
      receivedAtCommandId: resource.receivedAtCommandId,
      documentUrl: resource.documentUrl,
      postDataBytes: resourcesRecord.requestPostData?.length,
      requestHeaders: resource.request.headers,
      didMitmModifyHeaders:
        resourcesRecord.requestHeaders !== resourcesRecord.requestOriginalHeaders,
      originalRequestHeaders: resourcesRecord.requestOriginalHeaders,
      responseHeaders: resource.response?.headers,
      responseBodyBytes: resourcesRecord.responseDataBytes,
      statusCode: resource.response?.statusCode,
      browserServedFromCache: resource.response?.browserServedFromCache,
      browserLoadFailure: resource.response?.browserLoadFailure,
    };
    this.emit('resource', { resource: this.resourcesById[resource.id] });

    if (!resource.response?.statusCode) return;
    if (!this.matchesSearchFilter(resource.type, resource.response?.headers)) return;

    const headers = resource.response?.headers ?? {};
    const contentType = headers['content-type'] ?? headers['Content-Type'] ?? '';
    // search for terms
    const body = await this.db.resources.getResourceBodyById(resource.id, true);

    let formattedBody = body.toString();
    try {
      if (contentType.includes('json')) {
        formattedBody = JSON.stringify(JSON.parse(formattedBody), null, 2);
      }
    } catch {}

    await this.searchIndexByTabId[tabId].add({
      id: resource.id,
      body: formattedBody,
      url: resource.url,
    });
  }

  public matchesSearchFilter(
    resourceType: IResourceType,
    responseHeaders: IHttpHeaders = {},
  ): boolean {
    if (!SessionResourcesWatch.searchResourceTypes.has(resourceType)) return false;

    if (resourceType === 'Other') {
      const contentType = responseHeaders['content-type'] ?? responseHeaders['Content-Type'] ?? '';
      if (!contentType.includes('text') && !contentType.includes('json')) {
        return false;
      }
    }
    return true;
  }
}
