<template>
  <div class="h-full">
    <div class="search-view flex h-full flex-col overflow-hidden">
      <div class="form header-bar flex-none p-3">
        <h4 class="p-3 text-base font-bold">
          Deployed Datastores
        </h4>
      </div>
    </div>

    <ul class="flex-overflow flex flex-row px-3">
      <li
        v-for="datastore in datastores"
        :key="datastore.versionHash"
        class="justify-content h-10 h-full w-10 border border-slate-100 p-5"
      >
        <div>{{ datastore.name ?? '' }} {{ datastore.versionHash }}</div>
        <div class="text-sm">
          <span>Tables: {{ Object.keys(datastore.tablesByName) }}</span> |
          <span>Runners: {{ Object.keys(datastore.runnersByName) }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { PropType } from 'vue';
import { IDatastoreList } from '@ulixee/desktop-interfaces/apis/IDatastoreApi';
import { Client } from '@/api/Client';

export default Vue.defineComponent({
  name: 'Datastores',
  props: {
    clientsByMinerAddress: {
      type: Object as PropType<Map<string, Client<'desktop'>>>,
      required: true,
    },
  },
  components: {},
  setup() {
    const datastores = Vue.ref<(IDatastoreList['datastores'][0] & { minerAddress: string })[]>([]);

    return {
      datastores,
    };
  },
  methods: {
    async onClient(client: Client<'desktop'>): Promise<void> {
      const { datastores } = await client.send('Datastores.list');
      const minerAddress = client.address;
      this.datastores.push(...datastores.map(x => ({ ...x, minerAddress })));
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
  @apply bg-gray-100;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.Sessions {
  min-height: 200px;
}
</style>
