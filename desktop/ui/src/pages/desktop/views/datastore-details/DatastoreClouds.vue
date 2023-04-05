<template>
  <div
    class="flex flex-col items-center divide-y divide-gray-200 overflow-hidden overflow-hidden rounded-lg rounded-lg rounded-lg bg-white shadow ring-1 ring-black ring-opacity-5"
  >
    <h4 class="font-xl w-full bg-fuchsia-800/90 p-2 text-center text-sm font-semibold text-white">
      Deployed to Clouds
    </h4>
    <div class="w-full px-5 pb-2">
      <p v-if="errorMessage" class="px-1 py-2 text-sm font-semibold text-red-500">
        {{ errorMessage }}
      </p>
      <div v-for="cloud of clouds" class="my-5 flex flex-row items-center">
        <div class="mr-10">
          <Button
            v-if="!cloudDeployments[cloud.name]"
            @click.prevent="deploy(cloud.name)"
            :disabled="!isAdmin(cloud.name)"
            :class="[
              !isAdmin(cloud.name)
                ? 'cursor-not-allowed bg-gray-500/50'
                : 'cursor-pointer bg-fuchsia-800/90 focus:ring-2 focus:ring-fuchsia-600 focus:ring-offset-2',
              'relative inline-flex flex-shrink-0 rounded-md px-2.5 py-1',
            ]"
          >
            <CloudArrowUpIcon class="w-5 text-white" />
          </Button>
          <div v-else class="relative inline-flex flex-shrink-0 rounded-md px-2.5 py-1">
            <CloudIcon class="w-6 text-fuchsia-800" alt="Deployed" />
          </div>
        </div>

        <div class="m-2 basis-1/3 whitespace-nowrap">
          {{ getCloudName(cloud.name) }}
        </div>

        <div class="basis-1/3 text-sm font-light">
          <template v-if="cloud.name === 'public'">-</template>
          <template v-else
            >{{
              getCloudHost(cloud.name)
                .replace('ws://', 'ulx://')
                .replace('desktop', datastore.versionHash)
            }}
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { CheckIcon, ChevronUpDownIcon, CloudArrowUpIcon } from '@heroicons/vue/20/solid';
import {
  ArrowLeftIcon,
  ArrowRightCircleIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CloudIcon,
} from '@heroicons/vue/24/outline';
import { Switch } from '@headlessui/vue';
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';
import { useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';

export default Vue.defineComponent({
  name: 'DatastoreClouds',
  components: {
    CheckIcon,
    CloudIcon,
    CloudArrowUpIcon,
    ChevronUpDownIcon,
    ArrowLeftIcon,
    Switch,
    ArrowRightCircleIcon,
    ChevronRightIcon,
    ExclamationTriangleIcon,
  },
  setup() {
    const route = useRoute();
    const datastoresStore = useDatastoreStore();
    const versionHash = route.params.versionHash as string;
    const { summary, cloud: selectedCloud } = datastoresStore.getWithHash(versionHash);
    const cloudsStore = useCloudsStore();
    const { getCloudName, getCloudHost } = cloudsStore;

    const { datastoresByVersion } = storeToRefs(datastoresStore);
    const cloudDeployments = Vue.computed(() => {
      return datastoresByVersion.value[versionHash]?.deploymentsByCloud;
    });

    return {
      datastore: summary,
      selectedCloud,
      cloudDeployments,
      cloudsStore,
      errorMessage: Vue.ref(null),
      ...storeToRefs(cloudsStore),
      getCloudHost,
      getCloudName,
    };
  },
  methods: {
    async deploy(cloud: string) {
      this.errorMessage = null;
      const datastoresStore = useDatastoreStore();
      try {
        await datastoresStore.deploy(this.datastore, cloud);
      } catch (error: any) {
        this.errorMessage = String(error.message);
      }
    },
    isAdmin(cloud: string) {
      return !!this.cloudsStore.getAdmin(cloud);
    },
  },
});
</script>
