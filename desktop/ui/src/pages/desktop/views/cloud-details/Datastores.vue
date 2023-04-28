<template>
  <SwitchGroup as="div" class="mb-4 flex flex-shrink justify-end gap-3">
    <SwitchLabel as="span" class="flex-shrink text-sm font-medium leading-6 text-gray-900" passive
      >Latest Versions Only</SwitchLabel
    >
    <Switch
      v-model="showLatest"
      :class="[
        showLatest ? 'bg-fuchsia-800' : 'bg-gray-200',
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fuchsia-800 focus:ring-offset-2',
      ]"
    >
      <span
        aria-hidden="true"
        :class="[
          showLatest ? 'translate-x-5' : 'translate-x-0',
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
        ]"
      />
    </Switch>
  </SwitchGroup>
  <ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    <li v-if="!datastores.length" class="italic text-slate-700">Nothing found</li>
    <DatastoreCard
      v-for="datastore in datastores"
      :key="datastore.versionHash"
      :datastore="datastore"
      :includeVersion="!showLatest"
    />
  </ul>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { computed } from 'vue';
import { ArrowPathIcon } from '@heroicons/vue/20/solid';
import { ChartBarIcon, ChevronRightIcon, HeartIcon } from '@heroicons/vue/24/outline';
import { Switch, SwitchDescription, SwitchGroup, SwitchLabel } from '@headlessui/vue';
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
    Switch,
    SwitchDescription,
    SwitchGroup,
    SwitchLabel,
  },
  setup() {
    const route = useRoute();
    const datastoresStore = useDatastoreStore();
    const { datastoresByVersion } = storeToRefs(datastoresStore);
    const cloudName = route.params.name as string;
    const showLatest = Vue.ref(true);
    const datastores = computed(() => {
      const datastores: IDatastoreList = [];
      for (const entry of Object.values(datastoresByVersion.value)) {
        const datastore = entry.deploymentsByCloud[cloudName];
        if (!datastore) continue;
        if (datastore.latestVersionHash !== datastore.versionHash && showLatest.value) {
          // if it's on this server, continue
          if (
            datastoresByVersion.value[datastore.latestVersionHash]?.deploymentsByCloud?.[cloudName]
          ) {
            continue;
          }
        }
        datastores.push(datastore);
      }

      return datastores;
    });
    return {
      showLatest,
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
