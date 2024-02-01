<template>
  <div class="sm:flex sm:items-center sm:justify-between">
    <nav class="mt-3 flex" aria-label="Breadcrumb">
      <ol role="list" class="flex items-center space-x-4">
        <li>
          <div>
            <router-link
              class="text-2xl font-semibold text-gray-900 underline hover:text-gray-700"
              to="/datastores"
            >
              Datastores
            </router-link>
          </div>
        </li>
        <li v-if="datastore">
          <div class="flex items-center">
            <ChevronRightIcon class="h-5 w-5 flex-shrink-0 text-gray-500" aria-hidden="true" />
            <span class="ml-4 text-xl font-semibold leading-8 text-gray-500">
              {{ datastore.name ?? datastore.scriptEntrypoint }}
            </span>
          </div>
        </li>
      </ol>
    </nav>
  </div>
  <div class="h-full">
    <div class="relative mt-5 border-b border-gray-200 pb-5 sm:pb-0">
      <div class="border-b border-gray-200 pb-5 sm:pb-0">
        <div>
          <div class="absolute bottom-3 right-0 mt-0 mt-3 flex">
            <button
              type="button"
              class="group ml-2 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              @click.prevent="cloneModal.open()"
            >
              <DocumentDuplicateIcon
                class="-ml-0.5 mr-2 h-5 w-5 text-gray-900 group-hover:text-gray-950"
                aria-hidden="true"
              />
              Clone It!
            </button>
          </div>
        </div>

        <div class="mt-1">
          <nav class="-mb-px flex space-x-8">
            <router-link
              v-for="tab in tabs"
              :key="tab.path"
              :to="{
                name: tab.name,
                params: { datastoreId: datastore.id, version: datastore.version },
              }"
              :class="[
                $route.name === tab.name
                  ? 'border-fuchsia-700 text-fuchsia-800'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                'group inline-flex items-center whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium',
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
      <div class="-mx-4 -mx-8 -my-2 overflow-x-auto">
        <div class="inline-block min-w-full px-8 py-2 align-middle">
          <router-view />
        </div>
      </div>
    </div>
  </div>
  <CloneModal ref="cloneModal" :datastore="datastore" :selected-cloud="selectedCloud" />
</template>

<script lang="ts">
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';
import { useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import {
  ArrowDownTrayIcon,
  BanknotesIcon,
  ChartBarIcon,
  ChevronRightIcon,
  CircleStackIcon,
  CloudArrowUpIcon,
  CloudIcon,
  CreditCardIcon,
  HeartIcon,
  HomeIcon,
  TagIcon,
} from '@heroicons/vue/20/solid';
import {
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
} from '@heroicons/vue/24/outline';
import { storeToRefs } from 'pinia';
import * as Vue from 'vue';
import { useRoute } from 'vue-router';
import CloneModal from './CloneModal.vue';
import Queries from './Queries.vue';

export default Vue.defineComponent({
  name: 'Datastores',
  components: {
    CloudArrowUpIcon,
    ChevronRightIcon,
    CloudIcon,
    ChartBarIcon,
    HomeIcon,
    ArrowTopRightOnSquareIcon,
    CreditCardIcon,
    DocumentDuplicateIcon,
    DocumentTextIcon,
    TagIcon,
    BanknotesIcon,
    CloneModal,
    ArrowDownTrayIcon,
    Queries,
  },
  setup() {
    const route = useRoute();
    const datastoresStore = useDatastoreStore();
    const datastoreId = route.params.datastoreId as string;
    const version = route.params.version as string;
    const { datastoresById } = storeToRefs(datastoresStore);
    const summary = datastoresStore.get(datastoreId);
    const cloud = datastoresStore.getCloud(datastoreId, version);

    const cloudsStore = useCloudsStore();
    const { clouds } = storeToRefs(cloudsStore);
    const { getCloudName } = cloudsStore;

    const tabs = [
      { name: 'Overview', path: 'overview', icon: HomeIcon },
      { name: 'Entities', path: 'entities', icon: CircleStackIcon },
      { name: 'Queries', path: 'queries', icon: ChartBarIcon },
      { name: 'Reliability', path: 'reliability', icon: HeartIcon },
      { name: 'Versions', path: 'versions', icon: TagIcon },
    ];

    return {
      clouds,
      tabs,
      datastore: summary,
      selectedCloud: cloud,
      cloneModal: Vue.ref<typeof CloneModal>(null),
      getCloudName,
      datastoresStore,
      datastoresById,
    };
  },
  watch: {},
  methods: {},
});
</script>
