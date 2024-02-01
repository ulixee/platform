<template>
  <div
    class="flex flex-col items-center divide-y divide-gray-200 overflow-hidden overflow-hidden rounded-lg bg-white shadow ring-1 ring-black ring-opacity-5"
  >
    <div
      v-if="errorMessage"
      class="px-1 py-2 text-sm font-semibold bg-red-500/20 w-full text-center shadow-inner"
    >
      {{ errorMessage }}
    </div>
    <table class="min-w-full divide-y divide-gray-300">
      <thead class="bg-gray-50">
        <tr class="top-12 mb-1 bg-fuchsia-800/90 pb-1 text-left font-thin shadow-md">
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
            Version
          </th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
            Created Date
          </th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
            Deployed to Clouds
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 bg-white">
        <tr
          v-for="[version, entry] of Object.entries(versions)"
          :key="version"
          class="text-sm leading-loose hover:bg-gray-100/50"
        >
          <td class="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-500">
            {{ version }}
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            {{ formatDate(entry.timestamp) }}
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            <ul v-for="cloud in clouds" class="list ml-2 list-inside list-disc">
              <li>
                <span class="whitespace-nowrap">
                  {{ getCloudName(cloud.name) }}
                </span>
                <a
                  v-if="!entry.clouds.has(cloud.name)"
                  :disabled="!isCloudAdmin(cloud.name)"
                  class="ml-2 font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
                  :class="[!isCloudAdmin(cloud.name) ? 'cursor-not-allowed' : 'cursor-pointer']"
                  @click.prevent="deploy(version, cloud.name)"
                >
                  Deploy
                </a>
                <CheckIcon v-else class="align-text-top inline-block w-4 text-gray-800" />
              </li>
            </ul>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';
import { useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { Switch } from '@headlessui/vue';
import { CheckIcon, ChevronUpDownIcon, CloudArrowUpIcon } from '@heroicons/vue/20/solid';
import {
  ArrowLeftIcon,
  ArrowRightCircleIcon,
  ChevronRightIcon,
  CloudIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline';
import { storeToRefs } from 'pinia';
import * as Vue from 'vue';
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
    const datastoreId = route.params.datastoreId as string;
    const summary = datastoresStore.get(datastoreId);
    const cloudsStore = useCloudsStore();
    const { clouds } = storeToRefs(cloudsStore);
    const { getCloudName, getCloudHost } = cloudsStore;

    const { datastoresById } = storeToRefs(datastoresStore);

    const versions = Vue.ref<{ [version: string]: { timestamp: number; clouds: Set<string> } }>({});
    console.log(clouds.value);
    for (const cloud of clouds.value) {
      datastoresStore.getVersions(datastoreId, cloud.name, true).then(x => {
        for (const result of x) {
          versions.value[result.version] ??= { timestamp: result.timestamp, clouds: new Set() };
          versions.value[result.version].clouds.add(cloud.name);
        }
      });
    }
    const cloudDeployments = Vue.computed(() => {
      return datastoresById.value[datastoreId]?.cloudsByVersion;
    });

    return {
      datastore: summary,
      cloudDeployments,
      datastoreId,
      getCloudAddress: datastoresStore.getCloudAddress,
      cloudsStore,
      errorMessage: Vue.ref(null),
      clouds,
      versions,
      getCloudName,
    };
  },
  methods: {
    async deploy(version: string, cloud: string) {
      this.errorMessage = null;
      const datastoresStore = useDatastoreStore();
      try {
        await datastoresStore.deploy(this.datastoreId, version, cloud);
      } catch (error: any) {
        this.errorMessage = String(error.message);
      }
    },
    isCloudAdmin(cloud: string) {
      return !!this.cloudsStore.getAdmin(cloud);
    },
    formatDate(date: Date | number): string {
      if (!date) return 'now';
      if (typeof date === 'number') date = new Date(date);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    },
  },
});
</script>
