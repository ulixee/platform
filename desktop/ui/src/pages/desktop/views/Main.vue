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
          />
        </div>
        <div class="mt-2 flex flex-row">
          <label class="font-sm text-slate-500">Filter Sessions by:</label>
          <a
            href="javascript:void(0)"
            class="mx-5 text-slate-700"
            :class="{ 'font-bold': selectedFilter === 'hasError' }"
            @click="filterBy('hasError')"
            >Has Error</a
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import defaultClient, {Client} from '@/api/Client';
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue';
import { CheckIcon, ChevronLeftIcon, SelectorIcon } from '@heroicons/vue/solid';

const DesktopClient = defaultClient as Client<'desktop'>

export default Vue.defineComponent({
  name: 'Sessions',
  components: {
    Listbox,
    ListboxButton,
    ListboxLabel,
    ListboxOption,
    ListboxOptions,
    ChevronLeftIcon,
    CheckIcon,
    SelectorIcon,
  },
  setup() {
    return {
      inputText: Vue.ref(''),
      selectedFilter: Vue.ref<'hasError' | 'none'>(null),
      sessionResults: [],
    };
  },
  methods: {
    async runSearch() {
      const query = this.inputText;
      const searchResult = await DesktopClient.send('Sessions.search', query);
      this.onSearchResult(searchResult);
    },

    onSearchResult(searchResult) {
      console.log('Sessions.search', searchResult);
      this.sessionResults.length = 0;
      Object.assign(this.sessionResults, searchResult.sessions);
    },

    filterBy(type: 'hasError' | 'none') {
      if (this.selectedFilter === type) this.selectedFilter = null;
      else this.selectedFilter = type;
    },
  },
  mounted() {
    void DesktopClient.send('Sessions.list').then(this.onSearchResult);
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
  -webkit-app-region: drag;
}

.results {
  min-height: 200px;
}
</style>
