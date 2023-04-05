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
        <div class="md:flex md:items-center md:justify-between">
          <div
            class="mb-5 flex flex-row flex-wrap content-end items-center justify-between gap-x-4 divide-x divide-gray-400"
            v-if='datastore.description'
          >
            <div class="text-sm font-light text-gray-900 whitespace-pre-line">{{ datastore.description }}</div>
          </div>
          <div class="absolute bottom-3 right-0 mt-3 mt-0 flex">
            <button
              type="button"
              class="group inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              @click.prevent="openDocs"
            >
              <DocumentTextIcon
                class="group-hover:text-gray-950 -ml-0.5 mr-2 h-5 w-5 text-gray-900"
                aria-hidden="true"
              />
              View Docs
            </button>
            <button
              type="button"
              class="group ml-2 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              @click.prevent="cloneModal.open()"
            >
              <DocumentDuplicateIcon
                class="group-hover:text-gray-950 -ml-0.5 mr-2 h-5 w-5 text-gray-900"
                aria-hidden="true"
              />
              Clone It!
            </button>
            <button
              v-if="!installed && !adminIdentity"
              type="button"
              class="group ml-2 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              @click.prevent="install"
            >
              <ArrowDownTrayIcon
                class="group-hover:text-gray-950 -ml-0.5 mr-2 h-5 w-5 text-gray-900"
                aria-hidden="true"
              />
              Install
            </button>
            <button
              v-if="installed"
              type="button"
              class="underline-2 group ml-2 inline-flex items-center rounded-md bg-gray-800 px-3 py-2 text-sm font-bold text-white ring-1 ring-inset ring-gray-100"
              disabled
            >
              Installed!
            </button>
          </div>
        </div>

        <div class="mt-1">
          <nav class="-mb-px flex space-x-8">
            <router-link
              v-for="tab in tabs"
              :key="tab.path"
              :to="{ name: tab.name, params: { versionHash: datastore.versionHash } }"
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
  </div>
  <CloneModal :datastore="datastore" :selected-cloud="selectedCloud" ref="cloneModal" />
</template>

<script lang="ts">
import * as Vue from 'vue';
import { useRoute } from 'vue-router';
import {
  ArrowDownTrayIcon,
  BanknotesIcon,
  ChartBarIcon,
  ChevronRightIcon,
  CloudArrowUpIcon,
  CloudIcon,
  CreditCardIcon,
  HeartIcon,
} from '@heroicons/vue/20/solid';
import { DocumentTextIcon, DocumentDuplicateIcon } from '@heroicons/vue/24/outline';
import { storeToRefs } from 'pinia';
import { useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';
import Earnings from './Earnings.vue';
import Spend from './Spend.vue';
import CloneModal from './CloneModal.vue';
import Queries from './Queries.vue';

export default Vue.defineComponent({
  name: 'Datastores',
  components: {
    CloudArrowUpIcon,
    ChevronRightIcon,
    Earnings,
    CloudIcon,
    ChartBarIcon,
    CreditCardIcon,
    DocumentDuplicateIcon,
    DocumentTextIcon,
    BanknotesIcon,
    CloneModal,
    ArrowDownTrayIcon,
    Queries,
    Spend,
  },
  setup() {
    const route = useRoute();
    const datastoresStore = useDatastoreStore();
    const versionHash = route.params.versionHash as string;
    const { datastoresByVersion } = storeToRefs(datastoresStore);
    const { summary, cloud } = datastoresStore.getWithHash(versionHash);
    const installed = Vue.computed(() => datastoresByVersion.value[versionHash].isInstalled);

    const cloudsStore = useCloudsStore();
    const { clouds } = storeToRefs(cloudsStore);
    const cloudAddress = datastoresStore.getCloudAddress(versionHash, cloud);
    const { getCloudName } = cloudsStore;

    const tabs = [
      { name: 'Earned', path: 'earnings', icon: BanknotesIcon },
      { name: 'Spent', path: 'spend', icon: CreditCardIcon },
      { name: 'Queries', path: 'queries', icon: ChartBarIcon },
      { name: 'Reliability', path: 'reliability', icon: HeartIcon },
      { name: 'DatastoreClouds', label: 'Clouds', path: 'clouds', icon: CloudIcon },
    ];

    return {
      installed,
      clouds,
      tabs,
      datastore: summary,
      selectedCloud: cloud,
      cloneModal: Vue.ref<typeof CloneModal>(null),
      getCloudName,
      cloudAddress,
      datastoresStore,
      datastoresByVersion,
    };
  },
  watch: {},
  methods: {
    openDocs() {
      const versionHash = this.datastore.versionHash;
      this.datastoresStore.openDocs(versionHash, this.selectedCloud);
    },
    install() {
      this.datastoresStore.installDatastore(this.datastore.versionHash, this.selectedCloud);
    },
  },
});
</script>
