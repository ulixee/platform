<template>
  <div class="min-h-[400px]">
    <Listbox
      v-model="selectedVersion"
      as="div"
      class="space-between mx-auto mb-3 flex flex-row justify-center text-center"
    >
      <ListboxLabel class="mr-2 py-2 text-sm font-medium text-gray-900">
        Show Reliability for Version(s):
      </ListboxLabel>
      <div class="relative basis-1/3">
        <ListboxButton
          class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-fuchsia-800 sm:text-sm sm:leading-6"
        >
          <span class="block truncate">{{ selectedVersion }}</span>
          <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </ListboxButton>

        <transition
          leave-active-class="transition ease-in duration-100"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <ListboxOptions
            class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
          >
            <ListboxOption
              v-for="version in versions"
              :key="version.version"
              v-slot="{ active, selected }"
              as="template"
              :value="version.version"
            >
              <li
                :class="[
                  active ? 'bg-gray-700 text-white' : 'text-gray-900',
                  'relative cursor-default select-none py-2 pl-3 pr-9',
                ]"
              >
                <span
                  :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate text-left']"
                >{{ version.version }}</span>
                <span
                  v-if="selected"
                  :class="[
                    active ? 'text-white' : 'text-indigo-600',
                    'absolute inset-y-0 right-0 flex items-center pr-4',
                  ]"
                >
                  <CheckIcon class="h-5 w-5" aria-hidden="true" />
                </span>
              </li>
            </ListboxOption>
          </ListboxOptions>
        </transition>
      </div>
    </Listbox>

    <div class="overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5">
      <table class="min-w-full divide-y divide-gray-300">
        <thead class="bg-gray-50">
          <tr class="top-12 mb-1 bg-fuchsia-800/90 pb-1 text-left font-thin shadow-md">
            <th
              scope="col"
              class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6"
            >
              <a
                href="#"
                class="group inline-flex"
                @click.prevent="clickedHeader('type')"
              >
                Type
                <span
                  class="ml-2 flex-none rounded group-hover:visible group-hover:outline-white/50 group-focus:visible"
                  :class="[sortColumn !== 'type' ? 'invisible text-white group-hover:outline' : '']"
                >
                  <ChevronUpIcon
                    v-if="isAscending"
                    class="h-5 w-5"
                    aria-hidden="true"
                  />
                  <ChevronDownIcon
                    v-else
                    class="h-5 w-5"
                    aria-hidden="true"
                  />
                </span>
              </a>
            </th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
              <a
                href="#"
                class="group inline-flex"
                @click.prevent="clickedHeader('name')"
              >
                Name
                <span
                  class="ml-2 flex-none rounded group-hover:visible group-hover:outline-white/50 group-focus:visible"
                  :class="[sortColumn !== 'name' ? 'invisible text-white group-hover:outline' : '']"
                >
                  <ChevronUpIcon
                    v-if="isAscending"
                    class="h-5 w-5"
                    aria-hidden="true"
                  />
                  <ChevronDownIcon
                    v-else
                    class="h-5 w-5"
                    aria-hidden="true"
                  />
                </span>
              </a>
            </th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
              <a
                href="#"
                class="group inline-flex"
                @click.prevent="clickedHeader('queries')"
              >
                Queries
                <span
                  class="ml-2 flex-none rounded group-hover:visible group-hover:outline-white/50 group-focus:visible"
                  :class="[
                    sortColumn !== 'queries' ? 'invisible text-white group-hover:outline' : '',
                  ]"
                >
                  <ChevronUpIcon
                    v-if="isAscending"
                    class="h-5 w-5"
                    aria-hidden="true"
                  />
                  <ChevronDownIcon
                    v-else
                    class="h-5 w-5"
                    aria-hidden="true"
                  />
                </span>
              </a>
            </th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
              <a
                href="#"
                class="group inline-flex"
                @click.prevent="clickedHeader('errors')"
              >
                Errors
                <span
                  class="ml-2 flex-none rounded group-hover:visible group-hover:outline-white/50 group-focus:visible"
                  :class="[
                    sortColumn !== 'errors' ? 'invisible text-white group-hover:outline' : '',
                  ]"
                >
                  <ChevronUpIcon
                    v-if="isAscending"
                    class="h-5 w-5"
                    aria-hidden="true"
                  />
                  <ChevronDownIcon
                    v-else
                    class="h-5 w-5"
                    aria-hidden="true"
                  />
                </span>
              </a>
            </th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
              <a
                href="#"
                class="group inline-flex"
                @click.prevent="clickedHeader('size')"
              >
                Average Bytes
                <span
                  class="ml-2 flex-none rounded group-hover:visible group-hover:outline-white/50 group-focus:visible"
                  :class="[sortColumn !== 'size' ? 'invisible text-white group-hover:outline' : '']"
                >
                  <ChevronUpIcon
                    v-if="isAscending"
                    class="h-5 w-5"
                    aria-hidden="true"
                  />
                  <ChevronDownIcon
                    v-else
                    class="h-5 w-5"
                    aria-hidden="true"
                  />
                </span>
              </a>
            </th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
              <a
                href="#"
                class="group inline-flex"
                @click.prevent="clickedHeader('millis')"
              >
                Average Millis
                <span
                  class="ml-2 flex-none rounded group-hover:visible group-hover:outline-white/50 group-focus:visible"
                  :class="[
                    sortColumn !== 'millis' ? 'invisible text-white group-hover:outline' : '',
                  ]"
                >
                  <ChevronUpIcon
                    v-if="isAscending"
                    class="h-5 w-5"
                    aria-hidden="true"
                  />
                  <ChevronDownIcon
                    v-else
                    class="h-5 w-5"
                    aria-hidden="true"
                  />
                </span>
              </a>
            </th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
              <a
                href="#"
                class="group inline-flex"
                @click.prevent="clickedHeader('price')"
              >
                Average Price
                <span
                  class="ml-2 flex-none rounded group-hover:visible group-hover:outline-white/50 group-focus:visible"
                  :class="[
                    sortColumn !== 'price' ? 'invisible text-white group-hover:outline' : '',
                  ]"
                >
                  <ChevronUpIcon
                    v-if="isAscending"
                    class="h-5 w-5"
                    aria-hidden="true"
                  />
                  <ChevronDownIcon
                    v-else
                    class="h-5 w-5"
                    aria-hidden="true"
                  />
                </span>
              </a>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          <tr
            v-for="item of items"
            :key="item.name"
            class="text-sm leading-loose hover:bg-gray-100/50"
          >
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
              {{ item.stats.errors }}
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
  </div>
</template>

<script lang="ts">
import Prism from '@/pages/desktop/components/Prism.vue';
import { useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  CloudArrowUpIcon,
} from '@heroicons/vue/20/solid';
import { ArrowLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline';
import IDatastoreApiTypes from '@ulixee/platform-specification/datastore/DatastoreApis';
import { storeToRefs } from 'pinia';
import * as Vue from 'vue';
import { useRoute } from 'vue-router';

export default Vue.defineComponent({
  name: 'Reliability',
  components: {
    CheckIcon,
    CloudArrowUpIcon,
    ChevronUpDownIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ArrowLeftIcon,
    Listbox,
    ListboxButton,
    ListboxLabel,
    ListboxOption,
    ListboxOptions,
    ChevronRightIcon,
    Prism,
  },
  watch: {
    async selectedVersion(value) {
      if (value === 'Overall') {
        this.updateList();
        return;
      }

      this.stats = await this.datastoresStore.getStats(this.datastoreId, value);
    },
    stats() {
      this.updateList();
    },
    sortColumn() {
      this.updateList();
    },
    isAscending() {
      this.updateList();
    },
  },
  setup() {
    const route = useRoute();
    const datastoresStore = useDatastoreStore();
    const { datastoresById } = storeToRefs(datastoresStore);
    const version = route.params.version as string;
    const datastoreId = route.params.datastoreId as string;
    const selectedCloud = datastoresStore.getCloud(datastoreId, version);

    datastoresStore.getVersions(datastoreId, selectedCloud, true);

    const sortColumn = Vue.ref<'type' | 'queries' | 'price' | 'size' | 'millis' | 'name' | 'errors'>('name');
    const versions = Vue.computed(() => {
      return [{ version: 'Overall' }, ...(datastoresById.value[datastoreId]?.versions ?? [])];
    });

    const selectedVersion = Vue.ref('Overall');
    const isAscending = Vue.ref<boolean>(false);
    const stats = Vue.ref<IDatastoreApiTypes['Datastore.stats']['result']>({
      byVersion: [],
      overall: [],
    });
    datastoresStore.getStats(datastoreId, version).then(x => {
      stats.value = x;
    });
    const items = Vue.ref<IDatastoreApiTypes['Datastore.stats']['result']['overall']>([]);
    return {
      selectedVersion,
      isAscending,
      datastoresStore,
      datastoreId,
      version,
      stats,
      versions,
      sortColumn,
      items,
    };
  },
  methods: {
    clickedHeader(name: 'type' | 'queries' | 'price' | 'size' | 'millis' | 'name' | 'errors'): void {
      if (this.sortColumn === name) {
        this.isAscending = !this.isAscending;
      } else {
        this.sortColumn = name;
        this.isAscending = false;
      }
    },
    updateList() {
      const multiplier = this.isAscending ? -1 : 1;
      const statsToUse =
        this.selectedVersion === 'Overall' ? this.stats.overall : this.stats.byVersion;
      const sortColumn = this.sortColumn;
      this.items = statsToUse.sort((a, b) => {
        if (sortColumn === 'type') {
          if (a.type !== b.type) {
            return multiplier * a.type.localeCompare(b.type);
          }
        } else if (sortColumn === 'queries') {
          const statsOrder = a.stats.queries - b.stats.queries;
          if (statsOrder !== 0) return multiplier * statsOrder;
        } else if (sortColumn === 'price') {
          const statsOrder = a.stats.averageTotalPricePerQuery - b.stats.averageTotalPricePerQuery;
          if (statsOrder !== 0) return multiplier * statsOrder;
        } else if (sortColumn === 'size') {
          const statsOrder = a.stats.averageBytesPerQuery - b.stats.averageBytesPerQuery;
          if (statsOrder !== 0) return multiplier * statsOrder;
        } else if (sortColumn === 'millis') {
          const statsOrder = a.stats.averageMilliseconds - b.stats.averageMilliseconds;
          if (statsOrder !== 0) return multiplier * statsOrder;
        }
        return multiplier * a.name.localeCompare(b.name);
      });
    },
  },
});
</script>
