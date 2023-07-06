<template>
  <ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    <li v-if="!datastores.length" class="italic text-slate-700">Nothing found</li>
    <DatastoreCard
      v-for="datastore in datastores"
      :key="datastore.id"
      :datastore="datastore"
    />
  </ul>
</template>

<script lang="ts">
import DatastoreCard from '@/pages/desktop/components/DatastoreCard.vue';
import { IDatastoreSummary, useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { Switch, SwitchDescription, SwitchGroup, SwitchLabel } from '@headlessui/vue';
import { ArrowPathIcon } from '@heroicons/vue/20/solid';
import { ChartBarIcon, ChevronRightIcon, HeartIcon } from '@heroicons/vue/24/outline';
import { storeToRefs } from 'pinia';
import * as Vue from 'vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

export default Vue.defineComponent({
  name: 'Datastores',
  props: {},
  components: {
    ArrowPathIcon,
    DatastoreCard,
    HeartIcon,
    ChartBarIcon,
    ChevronRightIcon,
    Switch,
    SwitchDescription,
    SwitchGroup,
    SwitchLabel,
  },
  setup() {
    const route = useRoute();
    const datastoresStore = useDatastoreStore();
    const { datastoresById } = storeToRefs(datastoresStore);
    const cloudName = route.params.name as string;
    const datastores = computed(() => {
      const entries: IDatastoreSummary[] = [];
      for (const entry of Object.values(datastoresById.value)) {
        const isHosted = Object.values(entry.cloudsByVersion).some(x => x.includes(cloudName));
        if (!isHosted) continue;
        entries.push(entry.summary);
      }

      return entries;
    });
    return {
      datastores,
      datastoresStore,
    };
  },
  emits: [],
  methods: {
    selectDatastore(name: string, selectDatastore: IDatastoreSummary): void {
      this.$router.push(`/datastore/${selectDatastore.id}/${selectDatastore.version}`);
    },
  },
});
</script>
