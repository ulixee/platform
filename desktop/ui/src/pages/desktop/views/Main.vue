<template>
  <div class="Sessions">
    <div class="search-view flex h-full flex-col overflow-hidden">
      <div class="form header-bar flex-none p-3">
        <div class="flex flex-row">
          <input
            ref="inputElem"
            v-model="inputText"
            type="text"
            placeholder="Search for Sessions..."
            class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:outline-none"
            @keyup.enter="runSearch"
            @change="runSearch"
          >
        </div>
        <div class="mt-2 flex flex-row">
          <label class="font-sm text-slate-500">Filter Sessions by:</label>
          <a
            href="javascript:void(0)"
            class="mx-5 text-slate-700"
            :class="{ 'font-bold': selectedFilter === 'hasError' }"
            @click="filterBy('hasError')"
          >with error</a>
        </div>
      </div>
    </div>

    <h4 class="mt-2 p-3 text-base font-bold">
      Recent Sessions
    </h4>
    <ul class="list-inside px-3">
      <li
        v-for="session in filteredSessions"
        :key="session.heroSessionId"
        class="justify-content v-top mb-2 flex flex h-full flex-row border-b border-slate-100 pb-2 text-left"
      >
        <span class="flex basis-1/4 text-slate-600">{{ formatDate(session.startTime) }}</span>
        <span class="mx-2 block flex basis-2/4 content-between justify-between text-left">{{
          session.scriptEntrypoint
        }}</span>
        <span class="flex flex-1 whitespace-nowrap text-sm">
          <span v-if="session.state === 'error'">{{ session.error ?? 'Error' }}</span>
          <span v-else-if="session.state === 'running'">running</span>
        </span>
        <a
          href="javascript:void(0)"
          class="ml-10 whitespace-nowrap text-sm text-blue-600"
          @click.prevent="openReplay(session)"
        >
          Open Replay
        </a>
      </li>
    </ul>
  </div>
  <div class="Connections mt-5 p-3">
    <h4 class="text-base font-bold">
      Connected to Miners
    </h4>
    <ul class="list-inside list-disc">
      <li v-for="address in clientsByMinerAddress.keys()" :key="address">
        {{ address }}
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { Client } from '@/api/Client';
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue';
import {
  IHeroSessionsListResult,
  IHeroSessionsSearchResult,
} from '@ulixee/desktop-interfaces/apis/IHeroSessionsApi';
import moment from 'moment';

export default Vue.defineComponent({
  name: 'Sessions',
  components: {
    Listbox,
    ListboxButton,
    ListboxLabel,
    ListboxOption,
    ListboxOptions,
  },
  setup() {
    document.title = 'Ulixee Desktop';

    const selectedFilter = Vue.ref<'hasError' | 'none'>(null);
    const sessionIdsMatchingSearchToMatches = Vue.ref(new Map<string, IHeroSessionsSearchResult>());
    const sessions = Vue.ref<(IHeroSessionsListResult & { minerAddress: string })[]>([]);
    const inputText = Vue.ref('');
    const filteredSessions = Vue.computed<IHeroSessionsListResult[]>(() => {
      const filtered: IHeroSessionsListResult[] = [];
      for (const session of sessions.value) {
        if (selectedFilter.value === 'hasError' && session.state !== 'error') {
          continue;
        }
        if (inputText.value.trim()) {
          if (!sessionIdsMatchingSearchToMatches.value.has(session.heroSessionId)) {
            continue;
          }
        }
        filtered.push(session);
      }
      return filtered;
    });

    return {
      inputText,
      clientsByMinerAddress: Vue.ref(new Map<string, Client<'desktop'>>()),
      existingSessionIds: new Set<string>(),
      sessionIdsMatchingSearchToMatches,
      selectedFilter,
      sessions,
      filteredSessions,
    };
  },
  methods: {
    formatDate(date: Date): string {
      if (!date) return 'now';
      return moment(date).format('MM-D hh:mma');
    },

    isShowing(session: IHeroSessionsListResult): boolean {
      if (this.selectedFilter === 'hasError') return session.state === 'error';
    },

    openReplay(session: IHeroSessionsListResult & { minerAddress: string }): void {
      this.sendToBackend('Session.openReplay', {
        heroSessionId: session.heroSessionId,
        minerAddress: session.minerAddress,
        dbPath: session.dbPath,
      });
    },

    async runSearch() {
      const query = this.inputText;
      this.sessionIdsMatchingSearchToMatches.clear();
      console.log('search', query, this.clientsByMinerAddress);
      if (!query) {
        return;
      }
      for (const [, client] of this.clientsByMinerAddress) {
        const searchResults = await client.send('Sessions.search', query);
        for (const result of searchResults) {
          this.sessionIdsMatchingSearchToMatches.set(result.heroSessionId, result);
        }
      }
    },

    onSessionList(minerAddress: string, list: IHeroSessionsListResult[]): void {
      for (const result of list) {
        if (this.existingSessionIds.has(result.heroSessionId)) {
          const existing = this.sessions.find(x => x.heroSessionId === result.heroSessionId);
          Object.assign(existing, result);
        } else {
          this.existingSessionIds.add(result.heroSessionId);
          this.sessions.push({ ...result, minerAddress });
        }
      }
      this.sessions.sort((a, b) => {
        return b.startTime.getTime() - a.startTime.getTime();
      });
    },

    filterBy(type: 'hasError' | 'none') {
      if (this.selectedFilter === type) this.selectedFilter = null;
      else this.selectedFilter = type;
    },

    async onConnection(address: string, oldAddress?: string): Promise<void> {
      if (oldAddress) {
        this.clientsByMinerAddress.delete(oldAddress);
      }
      const client = new Client<'desktop'>();
      client.autoReconnect = false;
      client.address = address;
      client.on('Sessions.listUpdated', x => this.onSessionList(address, x));
      this.clientsByMinerAddress.set(address, client);
      await client.connect();
      const list = await client.send('Sessions.list');
      this.onSessionList(address, list);
    },

    sendToBackend(api: string, ...args: any[]) {
      document.dispatchEvent(
        new CustomEvent('desktop:api', {
          detail: { api, args },
        }),
      );
    },
  },
  mounted() {
    document.addEventListener('desktop:event', evt => {
      const { eventType, data } = (evt as CustomEvent).detail;
      if (eventType === 'Desktop.onRemoteConnected') {
        this.onConnection(data.newAddress, data.oldAddress).catch(console.error);
      }
    });
    this.sendToBackend('Desktop.publishConnections');
  },
  unmounted() {
    for (const connection of this.clientsByMinerAddress.values()) connection.close();
  },
});
</script>

<style lang="scss" scoped="scoped">
@use 'sass:math';

.icon {
  opacity: 0.5;
  &:hover {
    opacity: 1;
  }
}

.header-bar {
  @apply bg-gray-100;
  border-radius: 7px 7px 0 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.Sessions {
  min-height: 200px;
}
</style>
