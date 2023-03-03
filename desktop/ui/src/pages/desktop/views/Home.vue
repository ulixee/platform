<template>
  <div class="bar-wrapper">
    <ul class="tabbar flex w-full flex-row" role="tablist">
      <li
        v-for="tab of tabs"
        :key="tab.key"
        role="presentation"
      >
        <a
          :href="'#tab-' + tab.key"
          :class="[
            activeTab === tab.key ? 'border-slate-300 text-slate-900' : 'border-transparent',
          ]"
          class="block border-x-0 border-t-0 border-b-2 px-7 pt-6 pb-5 text-sm font-medium uppercase leading-tight text-neutral-500 hover:bg-slate-200"
          role="tab"
          @click.prevent="onTabClick(tab.key)"
        >{{ tab.title }}</a>
      </li>
    </ul>
    <div>
      <div
        v-show="activeTab === 'overview'"
        :class="[activeTab === 'overview' ? 'opacity-100' : 'opacity:0']"
        class="transition-opacity duration-150 ease-linear"
      >
        <Overview :clouds="clouds" />
      </div>
      <div
        v-show="activeTab === 'datastores'"
        :class="[activeTab === 'datastores' ? 'opacity-100' : 'opacity:0']"
        class="transition-opacity duration-150 ease-linear"
      >
        <Datastores ref="datastoresRef" :clouds="clouds" />
      </div>
      <div
        v-show="activeTab === 'sessions'"
        :class="[activeTab === 'sessions' ? 'opacity-100' : 'opacity:0']"
        class="transition-opacity duration-150 ease-linear"
      >
        <Sessions ref="sessionsRef" :clouds="clouds" />
      </div>
      <div
        v-show="activeTab === 'clouds'"
        :class="[activeTab === 'clouds' ? 'opacity-100' : 'opacity:0']"
        class="transition-opacity duration-150 ease-linear"
      >
        <Clouds :clouds="clouds" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { Client } from '@/api/Client';
import { ChevronDownIcon } from '@heroicons/vue/24/outline';
import ICloudConnection from '@/api/ICloudConnection';
import Sessions from './Sessions.vue';
import Clouds from './Clouds.vue';
import Datastores from './Datastores.vue';
import Overview from './Overview.vue';

const tabs = [
  // { title: 'Overview', key: 'overview' },
  { title: 'Datastores', key: 'datastores' },
  { title: 'Hero Sessions', key: 'sessions' },
  { title: 'Clouds', key: 'clouds' },
] as const;

type TTabKeys = {
  [K in (typeof tabs)[number]['key']]: string;
};
type ITabs = keyof TTabKeys;
export default Vue.defineComponent({
  name: 'DesktopHome',
  components: {
    Sessions,
    Clouds,
    Datastores,
    Overview,
    ChevronDownIcon,
  },
  setup() {
    return {
      clouds: Vue.ref<ICloudConnection[]>([
        { name: 'public', type: 'public', clientsByAddress: new Map() },
        { name: 'local', type: 'local', clientsByAddress: new Map() },
      ]),
      tabs,
      sessionsRef: Vue.ref<typeof Sessions>(null),
      datastoresRef: Vue.ref<typeof Datastores>(null),
      activeTab: Vue.ref<ITabs>(tabs[0].key),
    };
  },
  watch: {},
  methods: {
    onTabClick(key: ITabs): void {
      this.activeTab = key;
    },
    async onConnection(event: {
      name: string;
      type: ICloudConnection['type'];
      address: string;
      oldAddress?: string;
    }): Promise<void> {
      const { name, address, oldAddress, type } = event;
      let cloud = this.clouds.find(x => x.name === name);
      if (!cloud) {
        cloud = { name, type, clientsByAddress: new Map() };
        this.clouds.push(cloud);
        this.clouds.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          if (a.type === 'public') return -1;
          if (b.type === 'public') return 1;
          if (a.type === 'local') return 1;
          if (b.type === 'local') return -1;
          return 0;
        });
      }
      if (event.oldAddress) {
        cloud.clientsByAddress.get(oldAddress)?.close();
        cloud.clientsByAddress.delete(oldAddress);
      }
      const client = new Client<'desktop'>();
      client.autoReconnect = false;
      client.address = address;
      cloud.clientsByAddress.set(address, client);
      await client.connect();
      this.sessionsRef.onClient(cloud, client);
      this.datastoresRef.onClient(cloud, client);
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
      console.log('event', evt)
      const { eventType, data } = (evt as CustomEvent).detail;
      if (eventType === 'Desktop.onCloudConnected') {
        this.onConnection(data).catch(console.error);
      }
    });
    this.sendToBackend('Desktop.publishConnections');
  },
  unmounted() {
    for (const cloud of this.clouds.values()) {
      for (const connection of cloud.clientsByAddress.values()) connection.close();
    }
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
