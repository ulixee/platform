<template>
  <div class="h-full">
    <ArrowPathIcon
      class="absolute right-0 top-0 m-6 h-6 w-6 text-lg hover:text-slate-900"
      :class="[refreshing ? 'text-green-600' : 'text-slate-600']"
      :disabled="refreshing"
      @click.prevent="refresh"
    />

    <div v-for="[name, datastores] of orderedClouds" :key="name" class="mb-16">
      <h2 class="text-bold p-3 text-2xl">
        {{ getCloudName(name) }}
      </h2>
      <ul class="flex-overflow flex flex-row space-x-10 space-y-10 border-y-2 border-slate-100 p-3">
        <li v-if="!datastores.size" class="text-center text-lg text-slate-800">Nothing deployed</li>
        <li
          v-for="[versionHash, datastore] in datastores"
          :key="versionHash"
          class="justify-content my-5 w-96 cursor-context-menu border border-slate-100 p-5 shadow-md hover:shadow-sm"
          @contextmenu="onDatastoreContext($event, name, versionHash)"
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
          <div class="center mt-5 flex flex-row place-content-center pt-5 border-t border-slate-100 divide-x divide-slate-200">
            <div class="grid-col grid basis-1/2 place-content-center gap-4 text-center text-xl">
              <div class="text-2xl font-bold">₳{{ totalSpend(name, datastore) }}</div>
              <div class="font-thin">Spent</div>
            </div>
            <div class="grid-col grid basis-1/2 place-content-center gap-4 text-center text-xl">
              <div class="text-2xl font-bold">₳{{ totalEarned(name, datastore) }}</div>
              <div class="font-thin">Earned</div>
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

type IDatastoreList = IDatastoreApiTypes['Datastores.list']['result'];

export default Vue.defineComponent({
  name: 'Datastores',
  props: {
    clouds: {
      type: Object as PropType<Array<ICloudConnection>>,
      required: true,
    },
  },
  components: { ArrowPathIcon },
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
      orderedClouds: Vue.computed(() =>
        [...datastoresByCloud.value].sort((a, b) => {
          return (
            props.clouds.findIndex(x => a[0] === x.name) -
            props.clouds.findIndex(x => b[0] === x.name)
          );
        }),
      ),
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
    getCloudName(name: string): string {
      if (name === 'public') return 'Public Cloud';
      if (name === 'local') return 'Local Development Cloud';
      return name;
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
