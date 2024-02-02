<template>
  <div class="sm:flex sm:items-center sm:justify-between">
    <nav class="mt-3 flex" aria-label="Breadcrumb">
      <ol role="list" class="flex items-center space-x-4">
        <li>
          <div>
            <router-link
              class="text-2xl font-semibold text-gray-900 underline hover:text-gray-700"
              to="/clouds"
            >
              Clouds
            </router-link>
          </div>
        </li>
        <li>
          <div class="flex items-center">
            <ChevronRightIcon class="h-5 w-5 flex-shrink-0 text-gray-500" aria-hidden="true" />
            <span class="ml-4 text-xl font-semibold leading-8 text-gray-500">
              {{ getCloudName(cloud.name) }}
            </span>
          </div>
        </li>
      </ol>
    </nav>
  </div>
  <div class="h-full">
    <div class="relative mt-5 border-b border-gray-200 pb-5 sm:pb-0">
      <div class="mt-1">
        <nav class="-mb-px flex space-x-8">
          <router-link
            v-for="tab in tabs"
            :key="tab.path"
            :to="{ name: tab.name, params: { name: cloud.name } }"
            :class="[
              $route.name === tab.name
                ? 'border-fuchsia-700 text-fuchsia-800'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              'group inline-flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium',
            ]"
          >
            <component
              :is="tab.icon"
              :class="[
                $route.name === tab.name
                  ? 'text-fuchsia-800/80'
                  : 'text-gray-500 group-hover:text-gray-700',
                '-ml-0.5 mr-2 h-5 w-5',
              ]"
              aria-hidden="true"
            />
            <span>{{ tab.label ?? tab.name }}</span>
          </router-link>
        </nav>
      </div>
    </div>
  </div>
  <div class="mt-8 flow-root">
    <div class="-my-2 -mx-4 -mx-8 overflow-x-auto">
      <div class="inline-block min-w-full py-2 px-8 align-middle">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { useRoute } from 'vue-router';
import {
  BanknotesIcon,
  BuildingStorefrontIcon,
  ChevronRightIcon,
  CloudArrowUpIcon,
  CloudIcon,
  CogIcon,
  ServerStackIcon,
} from '@heroicons/vue/20/solid';
import { DocumentTextIcon } from '@heroicons/vue/24/outline';
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';

export default Vue.defineComponent({
  name: 'CloudDetails',
  components: {
    CloudArrowUpIcon,
    ChevronRightIcon,
    CloudIcon,
    DocumentTextIcon,
    BuildingStorefrontIcon,
    BanknotesIcon,
  },
  setup() {
    const route = useRoute();
    const cloudName = route.params.name as string;

    const cloudsStore = useCloudsStore();
    const cloud = cloudsStore.clouds.find(x => x.name === cloudName);
    const { getCloudName } = cloudsStore;

    const tabs = [
      { name: 'Datastores', path: 'datastores', icon: BuildingStorefrontIcon },
      { name: 'Connections', label: 'Nodes', path: 'connections', icon: ServerStackIcon },
      { name: 'Configure', path: 'configure', icon: CogIcon },
    ];

    return {
      tabs,
      cloud,
      getCloudName,
    };
  },
  watch: {},
  methods: {},
});
</script>
