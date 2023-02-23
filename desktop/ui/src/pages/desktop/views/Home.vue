<template>
  <div class="bar-wrapper flex h-full w-full flex-row items-stretch">
    <ul
      class="tabbar flex list-none flex-col flex-wrap whitespace-nowrap pl-0 text-center"
      role="tablist"
    >
      <li
        v-for="tab of tabs"
        :key="tab.key"
        role="presentation"
      >
        <a
          :href="'#tab-' + tab.key"
          :class="[activeTab === tab.key ? 'border-sky-400 text-slate-900' : 'border-transparent']"
          class="my-2 block border-x-0 border-t-0 border-b-2 px-7 pt-4 pb-3.5 text-xs font-medium uppercase leading-tight text-neutral-500 hover:bg-neutral-100"
          role="tab"
          @click.prevent="onTabClick(tab.key)"
        >{{ tab.title }}</a>
      </li>
    </ul>
    <div class="h-screen w-full overflow-auto">
      <div
        v-show="activeTab === 'datastores'"
        :class="[activeTab === 'datastores' ? 'opacity-100' : 'opacity:0']"
        class="transition-opacity duration-150 ease-linear"
      >
        <Datastores ref="datastoresRef" :clients-by-miner-address="clientsByMinerAddress" />
      </div>
      <div
        v-show="activeTab === 'sessions'"
        :class="[activeTab === 'sessions' ? 'opacity-100' : 'opacity:0']"
        class="transition-opacity duration-150 ease-linear"
      >
        <Sessions ref="sessionsRef" :clients-by-miner-address="clientsByMinerAddress" />
      </div>
      <div
        v-show="activeTab === 'remotes'"
        :class="[activeTab === 'remotes' ? 'opacity-100' : 'opacity:0']"
        class="transition-opacity duration-150 ease-linear"
      >
        <Remotes :clients-by-miner-address="clientsByMinerAddress" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { Client } from '@/api/Client';
import { ChevronDownIcon } from '@heroicons/vue/24/outline';
import Sessions from './Sessions.vue';
import Remotes from './Remotes.vue';
import Datastores from './Datastores.vue';

type ITabs = 'datastores' | 'sessions' | 'remotes';
export default Vue.defineComponent({
  name: 'DesktopHome',
  components: {
    Sessions,
    Remotes,
    Datastores,
    ChevronDownIcon,
  },
  setup() {
    return {
      clientsByMinerAddress: Vue.ref(new Map<string, Client<'desktop'>>()),
      tabs: [
        { title: 'Datastores', key: 'datastores' },
        { title: 'Hero Sessions', key: 'sessions' },
        { title: 'Cloud Nodes', key: 'remotes' },
      ],
      sessionsRef: Vue.ref<typeof Sessions>(null),
      datastoresRef: Vue.ref<typeof Datastores>(null),
      activeTab: Vue.ref<ITabs>('datastores'),
    };
  },
  watch: {},
  methods: {
    onTabClick(key: ITabs): void {
      this.activeTab = key;
    },
    async onConnection(address: string, oldAddress?: string): Promise<void> {
      if (oldAddress) {
        this.clientsByMinerAddress.delete(oldAddress);
      }
      const client = new Client<'desktop'>();
      client.autoReconnect = false;
      client.address = address;
      this.clientsByMinerAddress.set(address, client);
      await client.connect();
      this.sessionsRef.onClient(client);
      this.datastoresRef.onClient(client);
    },
    sendToBackend(api: string, ...args: any[]) {
      document.dispatchEvent(
        new CustomEvent('desktop:api', {
          detail: { api, args },
        }),
      );
    },
  },

  mounted() {
    document.addEventListener('desktop:event', evt => {
      const { eventType, data } = (evt as CustomEvent).detail;
      if (eventType === 'Desktop.onRemoteConnected') {
        this.onConnection(data.newAddress, data.oldAddress).catch(console.error);
      }
    });
    this.sendToBackend('Desktop.publishConnections');
  },
  unmounted() {
    for (const connection of this.clientsByMinerAddress.values()) connection.close();
  },
});
</script>

<style lang="scss" scoped>
@use 'sass:math';

.tabbar {
  @apply bg-slate-100;
  box-shadow: 1px 0 2px rgba(0, 0, 0, 0.2);
}
</style>
