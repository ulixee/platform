<template>
  <div class="h-full">
    <div class="form header-bar p-3">
      <h2 class="p-3 text-center text-lg font-bold uppercase">
        Deployed Datastores
      </h2>
      <ArrowPathIcon
        class="absolute right-0 top-0 m-6 h-6 w-6 text-lg text-slate-600 hover:text-slate-900"
      />
    </div>

    <ul class="flex-overflow flex flex-row space-x-10 space-y-10 px-3">
      <li
        v-for="[versionHash, datastore] in datastoresByVersion"
        :key="versionHash"
        class="justify-content my-5 w-96 border border-slate-100 shadow-md p-5"
      >
        <h5 class="font-md text-lg">
          {{ datastore.name ?? '' }} <span class="font-light font-md">{{ datastore.versionHash }}</span>
        </h5>
        <div class="text-sm">
          <div class="flex flex-row">
            <h5>Tables</h5>
            <span class="mx-2 rounded-full bg-gray-200	 h-6 text-xs p-1">{{ Object.keys(datastore.tablesByName).length }}</span>
            <span>{{ Object.keys(datastore.tablesByName).slice(0, 3).join(', ')
            }}{{ Object.keys(datastore.tablesByName).length > 3 ? ' ...' : '' }}</span>
          </div>

          <div class="flex flex-row">
            <h5>Crawlers</h5>
            <span class="mx-2 rounded-full bg-gray-200	 h-6 text-xs p-1">{{ Object.keys(datastore.crawlersByName).length }}</span>
            <span>{{ Object.keys(datastore.crawlersByName).slice(0, 3).join(', ')
            }}{{ Object.keys(datastore.crawlersByName).length > 3 ? ' ...' : '' }}</span>
          </div>

          <div class="flex flex-row">
            <h5>Runners</h5>
            <span class="mx-2 rounded-full bg-gray-200	 h-6 text-xs p-1">{{ Object.keys(datastore.runnersByName).length }}</span>
            <span>{{ Object.keys(datastore.runnersByName).slice(0, 3).join(', ')
            }}{{ Object.keys(datastore.runnersByName).length > 3 ? ' ...' : '' }}</span>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { PropType } from 'vue';
import { ArrowPathIcon } from '@heroicons/vue/24/outline';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import { Client } from '@/api/Client';

type IDatastoreList = IDatastoreApiTypes['Datastores.list']['result'];

export default Vue.defineComponent({
  name: 'Datastores',
  props: {
    clientsByMinerAddress: {
      type: Object as PropType<Map<string, Client<'desktop'>>>,
      required: true,
    },
  },
  components: { ArrowPathIcon },
  setup() {
    const datastoresByVersion = Vue.ref(
      new Map<string, IDatastoreList[0] & { minerAddress: string }>(),
    );

    return {
      datastoresByVersion,
    };
  },
  methods: {
    async onClient(client: Client<'desktop'>): Promise<void> {
      const datastores = await client.send('Datastores.list', {});
      const minerAddress = client.address;
      for (const datastore of datastores) {
        this.datastoresByVersion.set(datastore.versionHash, { ...datastore, minerAddress });
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
