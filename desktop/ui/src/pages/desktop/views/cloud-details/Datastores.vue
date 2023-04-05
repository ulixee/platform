<template>
  <ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    <li v-if="!datastores.length" class="italic text-slate-700">Nothing found</li>
    <DatastoreCard
      v-for="datastore in datastores"
      :key="datastore.versionHash"
      :datastore="datastore"
    />
  </ul>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { computed } from 'vue';
import { ArrowPathIcon } from '@heroicons/vue/20/solid';
import { ChartBarIcon, ChevronRightIcon, HeartIcon } from '@heroicons/vue/24/outline';
import DatastoreCard from '@/pages/desktop/components/DatastoreCard.vue';
import { IDatastoreList, useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';

export default Vue.defineComponent({
  name: 'Datastores',
  props: {},
  components: {
    ArrowPathIcon,
    DatastoreCard,
    HeartIcon,
    ChartBarIcon,
    ChevronRightIcon,
  },
  setup() {
    const route = useRoute();
    const datastoresStore = useDatastoreStore();
    const { datastoresByVersion } = storeToRefs(datastoresStore);
    const cloudName = route.params.name as string;

    const datastores = computed(() => {
      const datastores: IDatastoreList = [];
      for (const entry of Object.values(datastoresByVersion.value)) {
        const datastore = entry.deploymentsByCloud[cloudName];
        if (datastore) datastores.push(datastore);
      }
      return datastores;
    });
    return {
      datastores,
      datastoresStore,
    };
  },
  emits: [],
  methods: {
    selectDatastore(name: string, selectDatastore: IDatastoreList[0]): void {
      this.$router.push(`/datastore/${selectDatastore.versionHash}`);
    },
  },
});
</script>
