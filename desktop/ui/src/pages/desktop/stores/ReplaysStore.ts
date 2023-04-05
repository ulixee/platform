import { defineStore } from 'pinia';
import * as Vue from 'vue';
import {
  IHeroSessionsListResult,
  IHeroSessionsSearchResult,
} from '@ulixee/desktop-interfaces/apis/IHeroSessionsApi';
import { Client } from '@/api/Client';
import ICloudConnection from '@/api/ICloudConnection';
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';

export interface ICloudSessionResult extends IHeroSessionsListResult {
  cloudAddress: string;
  cloudName: string;
}

export const useReplaysStore = defineStore('replaysStore', () => {
  const existingSessionIds = new Set<string>();
  const sessionIdsMatchingSearchToMatches = Vue.ref(new Map<string, IHeroSessionsSearchResult>());
  const sessions = Vue.ref<ICloudSessionResult[]>([]);

  const lastOpenReplay = Vue.ref<IHeroSessionsListResult>(null);

  async function onClient(cloud: ICloudConnection, client: Client<'desktop'>): Promise<void> {
    if (cloud.type !== 'local') return;
    client.removeEventListeners('Sessions.listUpdated')
    client.on('Sessions.listUpdated', x => onSessionList(cloud, client.address, x));
    const list = await client.send('Sessions.list');
    onSessionList(cloud, client.address, list);
  }

  function onSessionList(
    cloud: ICloudConnection,
    cloudAddress: string,
    list: IHeroSessionsListResult[],
  ): void {
    for (const result of list) {
      if (existingSessionIds.has(result.heroSessionId)) {
        const existing = sessions.value.find(x => x.heroSessionId === result.heroSessionId);
        Object.assign(existing, result);
      } else {
        existingSessionIds.add(result.heroSessionId);
        sessions.value.push({ ...result, cloudAddress, cloudName: cloud.name });
      }
    }
    sessions.value.sort((a, b) => {
      return b.startTime.getTime() - a.startTime.getTime();
    });
  }

  async function search(query: string, selectedCloud: string) {
    const { clouds } = useCloudsStore();
    for (const cloud of clouds) {
      if (cloud.name !== selectedCloud) continue;
      for (const client of cloud.clientsByAddress.values()) {
        const searchResults = await client.send('Sessions.search', query);
        for (const result of searchResults) {
          sessionIdsMatchingSearchToMatches.value.set(result.heroSessionId, result);
        }
      }
    }
  }

  function openReplay(session: IHeroSessionsListResult & { cloudAddress: string }): void {
    lastOpenReplay.value = session;
    window.desktopApi.emit('Session.openReplay', {
      heroSessionId: session.heroSessionId,
      cloudAddress: session.cloudAddress,
      dbPath: session.dbPath,
    });
  }

  return {
    sessionIdsMatchingSearchToMatches,
    sessions,
    lastOpenReplay,
    openReplay,
    search,
    onClient,
  };
});
