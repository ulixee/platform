import IResourceSearchResult from '@ulixee/apps-chromealive-interfaces/IResourceSearchResult';
import { Session as HeroSession } from '@ulixee/hero-core';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import FuseJs from 'fuse.js';
import { ISearchContext } from '@ulixee/apps-chromealive-interfaces/ISessionSearchResult';
import IResourceMeta from '@bureau/interfaces/IResourceMeta';
import IResourceType from '@bureau/interfaces/IResourceType';

const Fuse = require('fuse.js/dist/fuse.common.js');

export default class ResourceSearch {
  private searchIndexByTabId: {
    [tabId: number]: FuseJs<{ id: number; body: string; url: string }>;
  } = {};

  constructor(private heroSession: HeroSession, private events: EventSubscriber) {
    this.events.on(this.heroSession, 'tab-created', this.onTabCreated.bind(this));
  }

  public search(query: string, context: ISearchContext): IResourceSearchResult[] {
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
      const resource = this.heroSession.resources.get(result.item.id);
      // must match document url
      if (documentUrl && resource.documentUrl !== documentUrl) continue;
      // allow an exception for the actual document
      const isPageLoad = resource.url === documentUrl;
      const timestamp = resource.response.browserLoadedTime ?? resource.response.timestamp;
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
        statusCode: resource.response.statusCode,
        url: resource.url,
        body: result.item.body,
        type: resource.type,
        matchIndices,
      });
    }
    return results;
  }

  public onTabCreated(event: HeroSession['EventTypes']['tab-created']): void {
    this.searchIndexByTabId[event.tab.id] = new Fuse([], {
      isCaseSensitive: false,
      findAllMatches: true,
      useExtendedSearch: true,
      minMatchCharLength: 3,
      keys: ['body', 'url'],
      ignoreLocation: true,
      ignoreFieldNorm: true,
      includeMatches: true,
    });
    this.events.on(event.tab, 'resource', this.onTabResource.bind(this, event.tab.id));
  }

  private async onTabResource(tabId: number, resource: IResourceMeta): Promise<void> {
    const allowedResourceTypes = new Set<IResourceType>([
      'Document',
      'XHR',
      'Fetch',
      'Script',
      'Websocket',
      'Other',
    ]);

    if (!resource.response?.statusCode) return;
    if (!allowedResourceTypes.has(resource.type)) return;

    const headers = resource.response?.headers ?? {};
    const contentType = headers['content-type'] ?? headers['Content-Type'] ?? '';

    if (resource.type === 'Other') {
      if (!contentType.includes('text') && !contentType.includes('json')) return;
    }
    // search for terms
    const body = await this.heroSession.db.resources.getResourceBodyById(resource.id, true);

    let formattedBody = body.toString();
    try {
      if (contentType.includes('json')) {
        formattedBody = JSON.stringify(JSON.parse(formattedBody), null, 2);
      }
    } catch (error) {
      console.error('ERROR parsing resource body', {
        error,
        resource,
      });
    }

    await this.searchIndexByTabId[tabId].add({
      id: resource.id,
      body: formattedBody,
      url: resource.url,
    });
  }
}
