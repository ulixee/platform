<template>
  <div class="Remotes h-full">
    <div class="form header-bar flex-none p-3">
      <div class="flex flex-row">
        <input
          ref="inputElem"
          v-model="inputText"
          type="text"
          placeholder="Connect to a Cloud Node"
          class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:outline-none"
          @keyup.enter="connect"
          @keyup="onTypeAddress"
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
      <p v-if="errorMessage" class="px-4 py-2 text-sm font-semibold text-red-500">
        {{ errorMessage }}
      </p>
    </div>
    <div class="Connections mt-5 p-3">
      <h4 class="text-base font-bold">
        Connected to Nodes
      </h4>
      <ul class="list-inside list-disc">
        <li v-for="address in clientsByMinerAddress.keys()" :key="address">
          {{ address }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { PropType } from 'vue';
import { Client } from '@/api/Client';
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue';

const isIpRegex = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/;

export default Vue.defineComponent({
  name: 'Remotes',
  props: {
    clientsByMinerAddress: {
      type: Object as PropType<Map<string, Client<'desktop'>>>,
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
      inputText: Vue.ref(''),
      errorMessage: Vue.ref(''),
      hasValidAddress: Vue.ref(false),
    };
  },
  methods: {
    onTypeAddress(): void {
      const isIp =
        isIpRegex.test(this.inputText) || isIpRegex.test(this.inputText.split(':').shift());
      if (isIp) {
        this.hasValidAddress = true;
        return;
      }

      try {
        this.errorMessage = null;
        new URL(this.inputText);
        this.hasValidAddress = true;
      } catch (_) {
        this.hasValidAddress = false;
      }
    },
    connect(): void {
      const address = this.inputText;
      this.sendToBackend('Desktop.connectToMiner', {
        address,
      });
      this.hasValidAddress = false;
      this.inputText = '';
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
      if (eventType === 'Desktop.connectToMinerError') {
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
  @apply bg-gray-100;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.Sessions {
  min-height: 200px;
}
</style>
