<template>
  <h2 class="mb-5 text-lg font-semibold">Your Queries</h2>
  <div class="overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5">
    <table class="max-w-full min-w-full divide-y divide-gray-300 overflow-hidden">
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
        <tr
          v-if="!Object.values(queries).length"
          class="text-sm leading-loose hover:bg-gray-100/50"
        >
          <td colspan="7" class="whitespace-nowrap py-4 pl-4 pr-3 font-light text-gray-600 sm:pl-6">
            You don't have any queries for this Datastore
          </td>
        </tr>
        <tr
          v-for="item of Object.values(queries)"
          :key="item.id"
          class="text-sm leading-loose hover:bg-gray-100/50"
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
            {{ item.outputs?.length ?? 0 }} Outputs
          </td>
          <td class="px-3 py-4 text-sm text-gray-500">
            {{ item.bytes }}
          </td>
          <td class="px-3 py-4 text-sm text-gray-500">
            {{ item.milliseconds }}
          </td>
          <td class="px-3 py-4 text-sm text-gray-500">{{ item.microgons ?? 0 }}₥</td>
        </tr>
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

export default Vue.defineComponent({
  name: 'DatastoreQueries',
  components: {
    ArrowLeftIcon,
    ChevronRightIcon,
  },
  setup() {
    const route = useRoute();
    const datastoresStore = useDatastoreStore();
    const { userQueriesByDatastore } = storeToRefs(datastoresStore);
    const versionHash = route.params.versionHash as string;

    const queries = userQueriesByDatastore.value[versionHash];
    return {
      queries,
    };
  },
  methods: {},
});
</script>
