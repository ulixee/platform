<template>
  <h1 class="mb-8 mt-3 text-2xl font-semibold text-gray-900">Hero Replays</h1>

  <Listbox
    as="div"
    v-model="selectedCloud"
    class="space-between mx-auto my-3 flex flex-row justify-center text-center"
  >
    <ListboxLabel class="mr-2 py-2 text-sm font-medium text-gray-900"
      >Show Sessions from:</ListboxLabel
    >
    <div class="relative basis-1/3">
      <ListboxButton
        class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-fuchsia-800 sm:text-sm sm:leading-6"
      >
        <span class="block truncate">{{ getCloudName(selectedCloud) }}</span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </ListboxButton>

      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <ListboxOptions
          class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
        >
          <ListboxOption
            as="template"
            v-for="cloud in adminClouds"
            :key="cloud.id"
            :value="cloud.name"
            v-slot="{ active, selected }"
          >
            <li
              :class="[
                active ? 'bg-gray-700 text-white' : 'text-gray-900',
                'relative cursor-default select-none py-2 pl-3 pr-9',
              ]"
            >
              <span
                :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate text-left']"
                >{{ getCloudName(cloud.name) }}</span
              >
              <span
                v-if="selected"
                :class="[
                  active ? 'text-white' : 'text-indigo-600',
                  'absolute inset-y-0 right-0 flex items-center pr-4',
                ]"
              >
                <CheckIcon class="h-5 w-5" aria-hidden="true" />
              </span>
            </li>
          </ListboxOption>
        </ListboxOptions>
      </transition>
    </div>
  </Listbox>
  <div
    class="overflow-hidden rounded-lg border-b border-gray-300 bg-white shadow-lg ring-1 ring-black ring-opacity-5"
  >
    <div class="w-full flex-none bg-fuchsia-800 px-5">
      <div class="mx-auto w-full py-3">
        <div class="relative text-white focus-within:text-gray-600">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon class="h-5 w-5" aria-hidden="true" />
          </div>
          <input
            ref="inputElem"
            v-model="inputText"
            @search="runSearch"
            @keyup.delete="searchChanged"
            class="block w-full rounded-md border-0 bg-white/20 py-1.5 pl-10 pr-3 text-white placeholder:text-white focus:bg-white focus:text-gray-900 focus:ring-0 focus:placeholder:text-gray-500"
            placeholder="Search"
            type="search"
            name="search"
          />
        </div>
      </div>
    </div>

    <table class="w-full table-auto">
      <thead class='h-0 invisible'>
        <tr class="hidden h-1">
          <th class="h-0 w-14">&nbsp;</th>
          <th class="w-4/10 h-0">&nbsp;</th>
          <th class="w-4/10 h-0">&nbsp;</th>
          <th class="h-0 w-10">&nbsp;</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="session in filteredSessions"
          :key="session.heroSessionId"
          class="text-sm v-top group border-b border-slate-100 text-left last:border-none hover:bg-gray-100/50"
        >
          <td class="whitespace-nowrap px-4 py-5 font-light text-slate-500">
            {{ formatDate(session.startTime) }}
          </td>
          <td
            class="text-ellipsis whitespace-nowrap px-4 py-5 text-left font-semibold text-slate-500"
          >
            {{ session.scriptEntrypoint
            }}<span class="ml-0.5 text-gray-400" v-if="session.datastore?.functionName"
              >#{{ session.datastore.functionName }}</span
            >
          </td>
          <td class="text-sm">
            <div v-if="session.state === 'error'">
              <ExclamationTriangleIcon class="relative mr-2 inline w-4 text-amber-800/60" />
              <span class="font-reg mr-1 italic text-slate-600">error at:</span
              ><span class="font-light text-slate-600">{{ session.errorCommand }}</span>

              <div class="ml-6 mt-1 -mb-1.5 whitespace-pre text-xs">
                {{ session.error ?? 'Error' }}
              </div>
            </div>
            <span
              class="mx-4 my-5 rounded-md bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-800"
              v-if='session.state !== "complete"'
              >{{ session.state }}</span
            >
          </td>
          <td class="">
            <a
              href="javascript:void(0)"
              class="my-3 whitespace-nowrap text-right"
              @click.prevent="openReplay(session)"
            >
              <PlayCircleIcon
                class="h-8 w-8 text-fuchsia-700 opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 group-hover:opacity-100"
              />
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue';
import { CheckIcon, ChevronUpDownIcon, MagnifyingGlassIcon } from '@heroicons/vue/20/solid';
import { IHeroSessionsListResult } from '@ulixee/desktop-interfaces/apis/IHeroSessionsApi';
import moment from 'moment';
import { ExclamationTriangleIcon, PlayCircleIcon } from '@heroicons/vue/24/outline';
import { useReplaysStore } from '@/pages/desktop/stores/ReplaysStore';
import { storeToRefs } from 'pinia';
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';

export interface ICloudSessionResult extends IHeroSessionsListResult {
  cloudAddress: string;
  cloudName: string;
}

export default Vue.defineComponent({
  name: 'Sessions',
  components: {
    MagnifyingGlassIcon,
    PlayCircleIcon,
    ExclamationTriangleIcon,
    ChevronUpDownIcon,
    CheckIcon,
    Listbox,
    ListboxButton,
    ListboxOptions,
    ListboxOption,
    ListboxLabel,
  },
  setup() {
    const selectedFilter = Vue.ref<'hasError' | 'none'>(null);
    const inputText = Vue.ref('');
    const didSearch = Vue.ref(false);
    const replaysStore = useReplaysStore();
    const cloudsStore = useCloudsStore();
    const { clouds } = storeToRefs(cloudsStore);
    const { getCloudName } = cloudsStore;
    const { sessions, sessionIdsMatchingSearchToMatches } = storeToRefs(replaysStore);

    const filteredSessions = Vue.computed<ICloudSessionResult[]>(() => {
      const filtered: ICloudSessionResult[] = [];
      for (const session of sessions.value) {
        if (selectedFilter.value === 'hasError' && session.state !== 'error') {
          continue;
        }
        if (didSearch.value) {
          if (!sessionIdsMatchingSearchToMatches.value.has(session.heroSessionId)) {
            continue;
          }
        }
        filtered.push(session);
      }
      return filtered;
    });

    const adminClouds = Vue.computed(() => {
      return clouds.value.filter(entry => {
        if (entry.type === 'local') return true;
        return !!entry.adminIdentity;
      });
    });

    return {
      inputText,
      sessionIdsMatchingSearchToMatches,
      selectedFilter,
      selectedCloud: Vue.ref('local'),
      adminClouds,
      sessions,
      filteredSessions,
      getCloudName,
      didSearch,
      replaysStore,
    };
  },
  methods: {
    formatDate(date: Date): string {
      if (!date) return 'now';
      return moment(date).format('M/D [at] hh:mma');
    },

    isShowing(session: IHeroSessionsListResult): boolean {
      if (this.selectedFilter === 'hasError') return session.state === 'error';
    },

    openReplay(session: IHeroSessionsListResult & { cloudAddress: string }): void {
      this.replaysStore.openReplay(session);
    },

    searchChanged() {
      if (!this.inputText) {
        this.sessionIdsMatchingSearchToMatches.clear();
        this.didSearch = false;
      }
    },

    async runSearch() {
      const query = this.inputText;
      this.sessionIdsMatchingSearchToMatches.clear();
      if (!query) {
        this.didSearch = false;
        return;
      }

      this.didSearch = true;
      this.replaysStore.search(query, this.selectedCloud);
    },

    filterBy(type: 'hasError' | 'none') {
      if (this.selectedFilter === type) this.selectedFilter = null;
      else this.selectedFilter = type;
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
  @apply bg-slate-100;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.Sessions {
  min-height: 200px;
}
</style>
