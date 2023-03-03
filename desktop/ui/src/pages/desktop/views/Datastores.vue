<template>
  <div class="h-full">
    <ArrowPathIcon
      v-if="!selectedDatastore"
      class="absolute right-0 top-0 m-6 h-6 w-6 text-lg hover:text-slate-900 hover:drop-shadow"
      :class="[refreshing ? 'text-green-600' : 'text-slate-600']"
      :disabled="refreshing"
      @click.prevent="refresh"
    />

    <DatastoreDetails
      v-if="selectedDatastore"
      :datastore="selectedDatastore.datastore"
      :selected-cloud="selectedDatastore.cloudName"
      :datastores-by-cloud="datastoresByCloud"
      :clouds="clouds"
      @clear-datastore="clearDatastore"
      @navigate="selectDatastore($event.cloud, $event.datastore)"
    />

    <div
      v-for="cloud of clouds"
      v-else
      :key="cloud.name"
      :set="(datastores = datastoresByCloud.get(cloud.name))"
      class="mb-16"
    >
      <h2 class="text-bold p-3 text-2xl">
        {{ getCloudName(cloud.name) }}
      </h2>
      <ul class="flex-overflow flex flex-row space-x-10 space-y-10 border-y-2 border-slate-100 p-3">
        <li v-if="!datastores.size" class="text-center text-lg text-slate-800">Nothing deployed</li>
        <li
          v-for="[versionHash, datastore] in datastores"
          :key="versionHash"
          class="justify-content my-5 w-96 cursor-pointer border border-slate-100 p-5 shadow-md hover:shadow-sm"
          @click.prevent="selectDatastore(cloud.name, datastore)"
        >
          <h5 class="font-md text-3xl font-thin">
            {{ datastore.name ?? '' }}
          </h5>
          <span class="font-reg text-sm text-slate-400">Version: {{ datastore.versionHash }}</span>
          <div class="pad-2 mt-5 grid grid-cols-3 text-center text-sm">
            <div class="flex flex-row">
              <h5>
                <span class="mr-2 text-xs font-bold">{{
                  Object.keys(datastore.tablesByName).length
                }}</span
                >Tables
              </h5>
            </div>

            <div class="center flex flex-row">
              <h5 class="text-center">
                <span class="mr-2 text-xs font-bold">{{
                  Object.keys(datastore.crawlersByName).length
                }}</span
                >Crawlers
              </h5>
            </div>

            <div class="flex flex-row">
              <h5>
                <span class="mr-2 text-xs font-bold">{{
                  Object.keys(datastore.runnersByName).length
                }}</span
                >Runners
              </h5>
            </div>
          </div>
          <div
            class="center mt-5 flex flex-row place-content-center divide-x divide-slate-200 border-t border-slate-100 pt-5"
          >
            <div
              v-if="argonActive"
              class="grid-col grid basis-1/2 place-content-center gap-4 text-center text-xl"
            >
              <div class="text-2xl font-bold">₳{{ totalSpend(name, datastore) }}</div>
              <div class="font-thin">Spent</div>
            </div>
            <div
              v-if="argonActive"
              class="grid-col grid basis-1/2 place-content-center gap-4 text-center text-xl"
            >
              <div class="text-2xl font-bold">₳{{ totalEarned(name, datastore) }}</div>
              <div class="font-thin">Earned</div>
            </div>
            <div v-if="!argonActive" class="place-content-center gap-4 text-center text-xl">
              <div class="text-2xl font-bold">
                {{ totalQueries(name, datastore) }}
              </div>
              <div class="font-thin">Queries</div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { PropType } from 'vue';
import { ArrowPathIcon } from '@heroicons/vue/24/outline';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import { Client } from '@/api/Client';
import ICloudConnection from '@/api/ICloudConnection';
import DatastoreDetails from './DatastoreDetails.vue';

type IDatastoreList = IDatastoreApiTypes['Datastores.list']['result'];

export default Vue.defineComponent({
  name: 'Datastores',
  props: {
    clouds: {
      type: Object as PropType<Array<ICloudConnection>>,
      required: true,
    },
  },
  components: { ArrowPathIcon, DatastoreDetails },
  setup(props) {
    const datastoresByCloud = Vue.ref(
      new Map<string, Map<string, IDatastoreList[0]>>(
        props.clouds.map(x => {
          return [x.name, new Map()];
        }),
      ),
    );

    return {
      datastoresByCloud,
      argonActive: Vue.ref(false),
      selectedDatastore: Vue.ref<{ datastore: IDatastoreList[0]; cloudName: string }>(),
      refreshing: Vue.ref(false),
    };
  },
  methods: {
    totalSpend(cloudName: string, datastore: IDatastoreList[0]): number {
      return 0;
    },
    totalEarned(cloudName: string, datastore: IDatastoreList[0]): number {
      return 12.64;
    },
    totalQueries(name: string, datastore: IDatastoreList[0]): number {
      let queries = 0;
      for (const entry of Object.values(datastore.tablesByName))
        queries += entry.stats.queries ?? 0;
      for (const entry of Object.values(datastore.runnersByName))
        queries += entry.stats.queries ?? 0;
      for (const entry of Object.values(datastore.crawlersByName))
        queries += entry.stats.queries ?? 0;
      return queries;
    },
    getCloudName(name: string): string {
      if (name === 'public') return 'Public Cloud';
      if (name === 'local') return 'Local Development Cloud';
      return name;
    },
    clearDatastore(): void {
      this.selectedDatastore = null;
    },
    selectDatastore(name: string, selectDatastore: IDatastoreList[0]): void {
      this.selectedDatastore = { datastore: selectDatastore, cloudName: name };
    },
    onDatastoreContext(e: MouseEvent, currentCloud: string, versionHash: string): void {
      e.preventDefault();
      const position = { x: e.x, y: e.y };
      document.dispatchEvent(
        new CustomEvent('desktop:api', {
          detail: {
            api: 'Datastore.contextMenu',
            args: [{ position, datastoreVersionHash: versionHash, cloud: currentCloud }],
          },
        }),
      );
    },
    async refresh(): Promise<void> {
      this.refreshing = true;
      for (const cloud of this.clouds) {
        const client = cloud.clientsByAddress.values().next().value;
        if (client) await this.onClient(cloud, client);
      }

      this.refreshing = false;
    },
    async onClient(cloud: ICloudConnection, client: Client<'desktop'>): Promise<void> {
      const datastores = await client.send('Datastores.list', {});
      if (!this.datastoresByCloud.has(cloud.name))
        this.datastoresByCloud.set(cloud.name, new Map());
      for (const datastore of datastores) {
        this.datastoresByCloud.get(cloud.name).set(datastore.versionHash, datastore);
      }
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
