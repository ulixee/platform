<template>
  <div class="Sessions h-full">
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

    <h4 class="mt-2 p-3 text-base font-bold">
      Recent Sessions
    </h4>
    <ul class="list-inside px-3">
      <li
        v-for="session in filteredSessions"
        :key="session.heroSessionId"
        class="justify-content v-top mb-2 flex flex h-full flex-row border-b border-slate-100 pb-2 text-left"
      >
        <span class="mr-3 basis-1/6 whitespace-nowrap text-slate-600">{{
          formatDate(session.startTime)
        }}</span>
        <span class="mx-2 block basis-2/5 content-between justify-between text-left">{{
          session.scriptEntrypoint
        }}</span>
        <span class="flex-1 basis-2/5 text-sm">
          <span v-if="session.state === 'error'">{{ session.error ?? 'Error' }}</span>
          <span v-else-if="session.state === 'running'">running</span>
        </span>
        <a
          href="javascript:void(0)"
          class="ml-10 basis-1/6 whitespace-nowrap text-right text-sm text-blue-600"
          @click.prevent="openReplay(session)"
        >
          Show ChromeAlive
        </a>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { PropType } from 'vue';
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
import { Client } from '@/api/Client';

export default Vue.defineComponent({
  name: 'Sessions',
  props: {
    clientsByMinerAddress: {
      type: Object as PropType<Map<string, Client<'desktop'>>>,
      required: true,
    },
  },
  components: {
    Listbox,
    ListboxButton,
    ListboxLabel,
    ListboxOption,
    ListboxOptions,
  },
  setup() {
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

    async onClient(client: Client<'desktop'>): Promise<void> {
      client.on('Sessions.listUpdated', x => this.onSessionList(client.address, x));
      const list = await client.send('Sessions.list');
      this.onSessionList(client.address, list);
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

    sendToBackend(api: string, ...args: any[]) {
      document.dispatchEvent(
        new CustomEvent('desktop:api', {
          detail: { api, args },
        }),
      );
    },
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
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.Sessions {
  min-height: 200px;
}
</style>
