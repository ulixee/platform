<template>
  <div
    class="flex w-1/2 flex-col items-center divide-y divide-gray-200 overflow-hidden overflow-hidden rounded-lg rounded-lg rounded-lg bg-white shadow ring-1 ring-black ring-opacity-5"
  >
    <h4 class="font-xl w-full bg-fuchsia-800/90 p-2 text-center text-sm font-semibold text-white">
      Reliability
    </h4>
    <div class="min-w-full bg-gray-50 bg-white py-3.5 text-2xl text-gray-700">
      <div class="flex flex-row">
        <span class="mr-5 basis-1/2 whitespace-nowrap text-right font-light">Errors</span>
        <span class="basis-1/2 text-fuchsia-700">{{ errors }}</span>
      </div>
      <div class="flex flex-row">
        <span class="mr-5 basis-1/2 whitespace-nowrap text-right font-light">Percentage</span>
        <span class="basis-1/2 text-fuchsia-700"
          >{{ runs > 0 ? Math.round((1000 * (runs - errors)) / runs) / 10 : 100 }}%</span
        >
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { useRoute } from 'vue-router';

export default Vue.defineComponent({
  name: 'Reliability',
  components: {},
  setup() {
    const route = useRoute();
    const datastoresStore = useDatastoreStore();
    const versionHash = route.params.versionHash as string;
    const { summary } = datastoresStore.getWithHash(versionHash);
    let errors = summary.stats.errors;
    let runs = summary.stats.queries;
    return {
      runs,
      errors,
    };
  },
  methods: {},
});
</script>
