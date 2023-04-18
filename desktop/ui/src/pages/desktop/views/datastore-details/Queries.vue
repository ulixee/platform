<template>
  <div class="mb-5 rounded-lg shadow ring-1 ring-black ring-opacity-5">
    <form action="#" class="relative">
      <div
        class="overflow-hidden rounded-lg bg-white shadow shadow-sm ring-1 ring-1 ring-inset ring-black ring-gray-300 ring-opacity-5 focus-within:ring-2 focus-within:ring-fuchsia-800"
      >
        <label for="query" class="sr-only">Run a query</label>

        <textarea
          rows="3"
          name="query"
          v-model="queryText"
          id="query"
          class="block w-full resize-none border-0 bg-transparent py-2.5 text-gray-900 placeholder:font-light placeholder:text-gray-500 focus:ring-0 sm:leading-6"
          placeholder="Enter a query to run against this Datastore. View docs for details."
        />
        <div class="py-2" aria-hidden="true">
          <div class="py-px">
            <div class="h-9" />
          </div>
        </div>
      </div>

      <div class="absolute inset-x-0 bottom-0 flex items-end justify-between py-2 pl-3 pr-2">
        <div class="flex-shrink-0">
          <button
            class="focus-visible:ring-fuchsia-8 inline-flex items-center rounded-md border border-fuchsia-800/70 bg-white px-3 py-1 text-sm font-semibold text-gray-700 shadow-sm hover:outline hover:outline-fuchsia-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
            :class="{ 'opacity-80': searching }"
            @click.prevent="runQuery"
            :disabled="searching"
          >
            Run Query
          </button>
        </div>
      </div>
    </form>
  </div>

  <h2 class="mb-5 text-lg font-semibold">Your Queries</h2>

  <div class="overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5">
    <table class="min-w-full max-w-full divide-y divide-gray-300 overflow-hidden">
      <thead class="bg-gray-50">
        <tr class="top-12 mb-1 bg-fuchsia-800/90 pb-1 text-left font-thin shadow-md">
          <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white">
            ID
          </th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Query</th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Input</th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Output</th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Bytes</th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Millis</th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Price</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 bg-white">
        <tr v-if="!queries.length" class="text-sm leading-loose hover:bg-gray-100/50">
          <td colspan="7" class="whitespace-nowrap py-4 pl-4 pr-3 font-light text-gray-600 sm:pl-6">
            You don't have any queries for this Datastore
          </td>
        </tr>
        <template v-for="item of queries" :key="item.id">
          <tr
            class="cursor-pointer text-sm leading-loose hover:bg-gray-100/50"
            :class="[selectedId === item.id ? 'bg-gray-100' : '']"
            @click="selectedId === item.id ? (selectedId = null) : (selectedId = item.id)"
          >
            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500">
              {{ item.id }}
            </td>
            <td class="px-3 py-4 text-sm font-medium text-gray-900">
              {{ item.query }}
            </td>
            <td class="px-3 py-4 text-sm text-gray-500">
              {{ item.input }}
            </td>
            <td class="px-3 py-4 text-sm text-gray-500" v-if="item.error">
              {{ item.error }}
            </td>
            <td class="px-3 py-4 text-sm text-gray-500" v-else>
              {{ item.outputs?.length ?? 0 }} Records
            </td>
            <td class="px-3 py-4 text-sm text-gray-500">
              {{ item.bytes }}
            </td>
            <td class="px-3 py-4 text-sm text-gray-500">
              {{ item.milliseconds }}
            </td>
            <td class="px-3 py-4 text-sm text-gray-500">{{ item.microgons ?? 0 }}₥</td>
          </tr>
          <tr v-if="selectedId === item.id">
            <td
              colspan="8"
              class="border-b border-fuchsia-800/80 p-0.5 shadow-inner shadow-fuchsia-800 max-w-full overflow-x-auto"
            >
              <div
                class="whitespace-pre-wrap py-8 pl-10 text-sm font-light text-gray-800"
                v-if="item.error"
              >
                {{ item.error.stack }}
              </div>
              <table
                class="min-w-full max-w-full divide-y divide-gray-300 overflow-x-auto pl-10"
                v-else
              >
                <thead class="bg-gray-50">
                  <tr class="mb-1 pb-1" v-if="item.outputs?.length">
                    <th
                      scope="col"
                      class="px-3 py-3.5 text-left text-sm font-medium"
                      v-for="key of Object.keys(item.outputs[0])"
                    >
                      {{ key }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                  <tr v-for="result of item.outputs ?? []">
                    <td
                      class="px-3 py-4 text-sm text-gray-500"
                      v-for="key of Object.keys(item.outputs[0])"
                    >
                      {{ result[key] }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { ArrowLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline';
import { useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import {
  FaceFrownIcon,
  FaceSmileIcon,
  FireIcon,
  HandThumbUpIcon,
  HeartIcon,
  PaperClipIcon,
  XMarkIcon,
} from '@heroicons/vue/20/solid';

export default Vue.defineComponent({
  name: 'DatastoreQueries',
  components: {
    FaceFrownIcon,
    FaceSmileIcon,
    FireIcon,
    HandThumbUpIcon,
    HeartIcon,
    PaperClipIcon,
    XMarkIcon,
    ArrowLeftIcon,
    ChevronRightIcon,
  },
  setup() {
    const route = useRoute();
    const datastoresStore = useDatastoreStore();
    const { userQueriesByDatastore } = storeToRefs(datastoresStore);
    const versionHash = route.params.versionHash as string;

    const queries = Vue.computed(() =>
      Object.values(userQueriesByDatastore.value[versionHash]).sort((a, b) => {
        if (!b.date) return -1;
        if (!a.date) return 1;
        return b.date.getTime() - a.date.getTime();
      }),
    );
    return {
      selectedId: Vue.ref<string>(),
      queryText: Vue.ref(''),
      searching: Vue.ref(false),
      queries,
      datastoresStore,
      versionHash,
    };
  },
  methods: {
    async runQuery() {
      this.searching = true;
      await this.datastoresStore.runQuery(this.versionHash, this.queryText);
      this.searching = false;
    },
  },
});
</script>
