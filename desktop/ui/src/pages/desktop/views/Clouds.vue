<template>
  <div class="h-full">
    <div
      v-for="cloud of clouds"
      :key="cloud.name"
      class="mb-5"
    >
      <h2 class="text-bold p-3 text-2xl">
        {{ getCloudName(cloud.name) }}
      </h2>
      <ul
        class="flex-overflow flex flex-row space-x-10 space-y-10 divide-y border-y-2 border-slate-100 p-3"
      >
        <li v-if="!cloud.clientsByAddress.size">
          No connection
        </li>
        <li
          v-for="address in cloud.clientsByAddress.keys()"
          :key="address"
          class="font-md font-thin"
        >
          {{ address }}
        </li>
      </ul>
    </div>

    <div class="p-3">
      <h5 class="font-md mt-10 font-bold">
        Connect to a Private Cloud
      </h5>
      <p v-if="errorMessage" class="px-1 py-2 text-sm font-semibold text-red-500">
        {{ errorMessage }}
      </p>
      <div class="flex w-full flex-row space-x-2">
        <input
          v-model="inputIpAddress"
          type="text"
          placeholder="Ip Address"
          class="basis-2/5 appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:outline-none"
          @keyup="onAddCloudType"
        >
        <input
          v-model="inputCloudName"
          type="text"
          placeholder="Cloud Name"
          class="basis-2/5 appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:outline-none"
        >
        <button
          class="rounded-r bg-sky-500 px-4 py-2 text-sm font-semibold text-white"
          :class="[hasValidAddress ? 'opacity-100' : 'opacity-20']"
          :disabled="!hasValidAddress"
          @click.prevent="connect"
        >
          Connect
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { PropType } from 'vue';
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue';
import ICloudConnection from '@/api/ICloudConnection';

const isIpRegex = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/;

export default Vue.defineComponent({
  name: 'Clouds',
  props: {
    clouds: {
      type: Object as PropType<Array<ICloudConnection>>,
      required: true,
    },
  },
  components: {
    Listbox,
    ListboxButton,
    ListboxLabel,
    ListboxOption,
    ListboxOptions,
  },
  setup() {
    return {
      inputIpAddress: Vue.ref(''),
      inputCloudName: Vue.ref(''),
      errorMessage: Vue.ref(''),
      hasValidAddress: Vue.ref(false),
    };
  },
  methods: {
    getCloudName(name: string): string {
      if (name === 'public') return 'Public Cloud';
      if (name === 'local') return 'Local Development Cloud';
      return name;
    },
    onAddCloudType(): void {
      const isIp =
        isIpRegex.test(this.inputIpAddress) ||
        isIpRegex.test(this.inputIpAddress.split(':').shift());
      if (isIp) {
        this.hasValidAddress = true;
        return;
      }

      try {
        this.errorMessage = null;
        new URL(this.inputIpAddress);
        this.hasValidAddress = true;
      } catch (_) {
        this.hasValidAddress = false;
      }
    },
    connect(): void {
      if (!this.hasValidAddress) {
        this.errorMessage = 'Please enter a valid ip address or domain name.';
        return;
      }
      const name = this.inputCloudName;
      if (!name) {
        this.errorMessage = 'Please add a name for this cloud';
        return;
      }

      this.sendToBackend('Desktop.connectToPrivateCloud', {
        address: this.inputIpAddress,
        name,
      });
      this.hasValidAddress = false;
      this.inputIpAddress = '';
      this.inputCloudName = '';
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
      if (eventType === 'Desktop.connectToPrivateCloudError') {
        this.errorMessage = `${data.address}: ${data.message}`;
      }
    });
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
