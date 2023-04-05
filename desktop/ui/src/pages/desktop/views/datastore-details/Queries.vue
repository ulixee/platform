<template>
  <div class="overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5">
    <table class="min-w-full divide-y divide-gray-300">
      <thead class="bg-gray-50">
        <tr class="top-12 mb-1 bg-fuchsia-800/90 pb-1 text-left font-thin shadow-md">
          <th
            scope="col"
            class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6"
          >
            <a href="#" class="group inline-flex" @click.prevent="sortColumn = 'default'">
              Type
              <span
                class="ml-2 flex-none rounded group-hover:visible group-hover:outline-white/50 group-focus:visible"
                :class="[
                  sortColumn !== 'default' ? 'invisible text-white group-hover:outline' : '',
                ]"
              >
                <ChevronDownIcon class="h-5 w-5" aria-hidden="true" />
              </span>
            </a>
          </th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
            <a href="#" class="group inline-flex" @click.prevent="sortColumn = 'name'">
              Name
              <span
                class="ml-2 flex-none rounded group-hover:visible group-hover:outline-white/50 group-focus:visible"
                :class="[sortColumn !== 'name' ? 'invisible text-white group-hover:outline' : '']"
              >
                <ChevronDownIcon on class="h-5 w-5" aria-hidden="true" />
              </span>
            </a>
          </th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
            <a href="#" class="group inline-flex" @click.prevent="sortColumn = 'queries'">
              Queries
              <span
                class="ml-2 flex-none rounded group-hover:visible group-hover:outline-white/50 group-focus:visible"
                :class="[
                  sortColumn !== 'queries' ? 'invisible text-white group-hover:outline' : '',
                ]"
              >
                <ChevronDownIcon class="h-5 w-5" aria-hidden="true" />
              </span>
            </a>
          </th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
            <a href="#" class="group inline-flex" @click.prevent="sortColumn = 'size'">
              Average Bytes
              <span
                class="ml-2 flex-none rounded group-hover:visible group-hover:outline-white/50 group-focus:visible"
                :class="[sortColumn !== 'size' ? 'invisible text-white group-hover:outline' : '']"
              >
                <ChevronDownIcon class="h-5 w-5" aria-hidden="true" />
              </span>
            </a>
          </th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
            <a href="#" class="group inline-flex" @click.prevent="sortColumn = 'millis'">
              Average Millis
              <span
                class="ml-2 flex-none rounded group-hover:visible group-hover:outline-white/50 group-focus:visible"
                :class="[sortColumn !== 'millis' ? 'invisible text-white group-hover:outline' : '']"
              >
                <ChevronDownIcon class="h-5 w-5" aria-hidden="true" />
              </span>
            </a>
          </th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
            <a href="#" class="group inline-flex" @click.prevent="sortColumn = 'price'">
              Average Price
              <span
                class="ml-2 flex-none rounded group-hover:visible group-hover:outline-white/50 group-focus:visible"
                :class="[sortColumn !== 'price' ? 'invisible text-white group-hover:outline' : '']"
              >
                <ChevronDownIcon class="h-5 w-5" aria-hidden="true" />
              </span>
            </a>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 bg-white">
        <tr v-for="item of items" :key="name" class="text-sm leading-loose hover:bg-gray-100/50">
          <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
            {{ item.type }}
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
            {{ item.name }}
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            {{ item.stats.queries }}
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            {{ item.stats.averageBytesPerQuery }}
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            {{ item.stats.averageMilliseconds }}
          </td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            ₳{{ item.stats.averageTotalPricePerQuery ?? 0 }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  CloudArrowUpIcon,
} from '@heroicons/vue/20/solid';
import { ArrowLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline';
import { IDatastoreMeta, useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import Prism from '../../components/Prism.vue';

export default Vue.defineComponent({
  name: 'Datastores',
  components: {
    CheckIcon,
    CloudArrowUpIcon,
    ChevronUpDownIcon,
    ChevronDownIcon,
    ArrowLeftIcon,
    ChevronRightIcon,
    Prism,
  },
  setup() {
    const route = useRoute();
    const datastoresStore = useDatastoreStore();
    const { datastoresByVersion } = storeToRefs(datastoresStore);
    const versionHash = route.params.versionHash as string;

    datastoresStore.refreshMetadata(versionHash);

    const sortColumn = Vue.ref<'default' | 'queries' | 'price' | 'size' | 'millis' | 'name'>(
      'default',
    );
    const items = Vue.computed(() => {
      const { datastore } = datastoresByVersion.value[versionHash];

      const entries: {
        name: string;
        stats: IDatastoreMeta['tablesByName']['']['stats'];
        type: string;
      }[] = [
        ...Object.entries(datastore?.tablesByName ?? {}).map(x => ({
          stats: x[1].stats,
          name: x[0],
          type: 'Table',
        })),
        ...Object.entries(datastore?.crawlersByName ?? {}).map(x => ({
          stats: x[1].stats,
          name: x[0],
          type: 'Crawler',
        })),
        ...Object.entries(datastore?.runnersByName ?? {}).map(x => ({
          stats: x[1].stats,
          name: x[0],
          type: 'Runner',
        })),
      ];
      return entries.sort((a, b) => {
        if (sortColumn.value === 'default') {
          if (a.type !== b.type) {
            return a.type.localeCompare(b.type);
          }
        } else if (sortColumn.value === 'queries') {
          const statsOrder = a.stats.queries - b.stats.queries;
          if (statsOrder !== 0) return statsOrder;
        } else if (sortColumn.value === 'price') {
          const statsOrder = a.stats.averageTotalPricePerQuery - b.stats.averageTotalPricePerQuery;
          if (statsOrder !== 0) return statsOrder;
        } else if (sortColumn.value === 'size') {
          const statsOrder = a.stats.averageBytesPerQuery - b.stats.averageBytesPerQuery;
          if (statsOrder !== 0) return statsOrder;
        } else if (sortColumn.value === 'millis') {
          const statsOrder = a.stats.averageMilliseconds - b.stats.averageMilliseconds;
          if (statsOrder !== 0) return statsOrder;
        }
        return a.name.localeCompare(b.name);
      });
    });
    return {
      sortColumn,
      items,
    };
  },
  methods: {},
});
</script>
