[
<template>
  <div class="h-full">
    <div class="sm:flex sm:items-center sm:justify-between">
      <nav class="mt-3 flex" aria-label="Breadcrumb">
        <ol role="list" class="flex items-center space-x-4">
          <li>
            <div>
              <span class="text-2xl font-semibold text-gray-900 hover:text-gray-700"
                >Datastores</span
              >
            </div>
          </li>
        </ol>
      </nav>
    </div>

    <div class="isolate mt-10 mb-5 border-b border-gray-200 pb-5">
      <div
        class="relative mx-auto flex w-1/2 flex-row items-center justify-center rounded-full shadow"
      >
        <button
          type="button"
          class="relative basis-1/3 items-center rounded-l-full px-3 py-2 text-center text-sm font-semibold ring-1 ring-inset ring-fuchsia-700 ring-opacity-50 focus:z-10"
          :class="[
            active === 'local'
              ? 'bg-fuchsia-800/90 text-white'
              : 'bg-white text-gray-900 hover:bg-gray-50 ',
          ]"
          @click.prevent="active = 'local'"
        >
          Local
        </button>
        <button
          type="button"
          class="relative -ml-px basis-1/3 items-center px-3 py-2 text-center text-sm font-semibold ring-1 ring-inset ring-fuchsia-700 ring-opacity-50 focus:z-10"
          :class="[
            active === 'installed'
              ? 'bg-fuchsia-800/90 text-white'
              : 'bg-white text-gray-900 hover:bg-gray-50 ',
          ]"
          @click.prevent="active = 'installed'"
        >
          Installed
        </button>
        <button
          type="button"
          class="relative -ml-px basis-1/3 items-center rounded-r-full px-3 py-2 text-center text-sm font-semibold ring-1 ring-inset ring-fuchsia-700 ring-opacity-50 focus:z-10"
          :class="[
            active === 'admin'
              ? 'bg-fuchsia-800/90 text-white'
              : 'bg-white text-gray-900 hover:bg-gray-50 ',
          ]"
          @click.prevent="active = 'admin'"
        >
          Admin
        </button>
        <button
          type="button"
          class="group absolute -right-16 inline-flex items-center rounded-full border border-fuchsia-700 bg-white p-1 text-sm font-semibold shadow-sm hover:bg-fuchsia-800/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
          :disabled="refreshing"
          :class="[refreshing ? 'bg-fuchsia-800/40 text-white' : 'text-white']"
          @click.prevent="refresh()"
        >
          <ArrowPathIcon
            class="h-5 w-5"
            aria-hidden="true"
            :class="[refreshing ? 'text-white' : 'text-fuchsia-700 group-hover:text-white']"
          />
        </button>
      </div>
    </div>

    <div class="mt-5">
      <ul class="grid grid-rows-6 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <li v-if="!datastores.length" class="italic text-slate-700">Nothing found</li>
        <DatastoreCard
          v-for="datastore in datastores"
          :key="datastore.versionHash"
          :datastore="datastore"
        />
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { computed } from 'vue';
import { ArrowPathIcon } from '@heroicons/vue/20/solid';
import { ChartBarIcon, ChevronRightIcon, HeartIcon } from '@heroicons/vue/24/outline';
import DatastoreCard from '@/pages/desktop/components/DatastoreCard.vue';
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';
import { IDatastoreList, useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
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
    const datastoresStore = useDatastoreStore();
    const cloudsStore = useCloudsStore();
    const { datastoresByVersion } = storeToRefs(datastoresStore);
    const { getCloudName, getAdmin } = cloudsStore;

    const active = Vue.ref<'local' | 'admin' | 'installed'>('local');

    const datastores = computed(() => {
      const list: IDatastoreList = [];
      for (const entry of Object.values(datastoresByVersion.value)) {
        if (active.value === 'local') {
          const localEntry = entry.deploymentsByCloud.local;
          if (localEntry) {
            list.push(localEntry);
          }
        } else if (active.value === 'installed') {
          let didAdd = false;
          const options = Object.entries(entry.deploymentsByCloud);
          for (const [name, datastore] of options) {
            if (name !== 'local') {
              list.push(datastore);
              didAdd = true;
            }
          }
          if (!didAdd) list.push(entry.deploymentsByCloud.local);
        } else if (active.value === 'admin') {
          const adminClouds = Object.keys(entry.deploymentsByCloud).filter(
            x => x !== 'local' && !!getAdmin(x),
          );
          if (entry.adminIdentity || adminClouds.length) {
            const datastore = adminClouds.length
              ? entry.deploymentsByCloud[adminClouds[0]]
              : Object.values(entry.deploymentsByCloud)[0];

            list.push(datastore);
          }
        }
      }
      return list;
    });
    return {
      datastores,
      datastoresStore,
      active,
      argonActive: Vue.ref(false),
      refreshing: Vue.ref(false),
      getCloudName,
    };
  },
  emits: [],
  methods: {
    selectDatastore(name: string, selectDatastore: IDatastoreList[0]): void {
      void this.$router.push(`/datastore/${selectDatastore.versionHash}`);
    },
    async refresh() {
      this.refreshing = true;
      await this.datastoresStore.refresh();
      this.refreshing = false;
    },
  },
});
</script>

<style lang="scss" scoped="scoped">
@use 'sass:math';

.icon {
  opacity: 0.5;
  &:hover {
    opacity: 1;
  }
}

.header-bar {
  @apply bg-slate-100;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.Sessions {
  min-height: 200px;
}
</style>
