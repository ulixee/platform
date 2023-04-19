<template>
  <Modal ref="modal" title="Add a Cloud" dialog-class="w-1/2" :closeHandler="onClose">
    <div class="divider-y divider-slate-100 items-left flex flex-col">
      <nav class="mt-2 mb-5 flex space-x-8 px-2">
        <a
          v-for="tab in [{ name: 'Connect' }, { name: 'Setup' }]"
          :class="[
            activeTab === tab.name
              ? 'border-fuchsia-700 text-fuchsia-800'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
            'group inline-flex cursor-pointer items-center whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium',
          ]"
          @click.prevent="activeTab = tab.name"
        >
          <component
            :is="tab.icon"
            :class="[
              activeTab === tab.name
                ? 'text-fuchsia-800/80'
                : 'text-gray-500 group-hover:text-gray-700',
              '-ml-0.5 mr-2 h-5 w-5',
            ]"
            aria-hidden="true"
          />
          <span>{{ tab.name }}</span>
        </a>
      </nav>
      <div v-if="activeTab === 'Connect'">
        <p class="border-b border-gray-200 px-3 pb-3 text-sm text-base font-light text-gray-500">
          If you've deployed Ulixee Cloud to your own servers, you can connect to it here to view
          statistics, earnings and troubleshoot remote Hero sessions. You can also connect to any
          publicly accessible Ulixee Cloud you'd like to use.
        </p>
        <div
          class="my-5 grid grid-cols-1 gap-x-6 gap-y-8 px-3 text-sm font-light text-gray-700 sm:grid-cols-6"
        >
          <p v-if="errorMessage" class="col-span-4 px-1 py-2 text-sm font-semibold text-red-500">
            {{ errorMessage }}
          </p>

          <div class="col-span-6">
            <label for="ip" class="block text-sm font-medium leading-6 text-gray-900"
              >Enter the Cloud IP Address and Port</label
            >
            <div class="mt-2">
              <input
                v-model="inputIpAddress"
                id="ip"
                type="text"
                placeholder="address"
                class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-fuchsia-700 sm:text-sm sm:leading-6"
                @keyup="onAddCloudType"
              />
            </div>
          </div>

          <div class="col-span-6">
            <label for="name" class="block text-sm font-medium leading-6 text-gray-900"
              >Give this Cloud a Name <span class="font-light">- only used in this app</span></label
            >
            <div class="mt-2">
              <input
                v-model="inputCloudName"
                id="name"
                type="text"
                placeholder="name"
                class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-fuchsia-700 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <button
            class="col-span-6 mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md bg-fuchsia-700 py-2.5 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
            :class="[
              !hasValidAddress ? 'cursor-not-allowed bg-fuchsia-700/50' : 'hover:bg-fuchsia-600',
            ]"
            :disabled="!hasValidAddress"
            @click.prevent="connect"
          >
            <PhoneArrowUpRightIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Connect
          </button>
        </div>
      </div>

      <div class="px-3 text-sm font-light text-gray-700" v-else>
        <p class="mb-5 border-b border-gray-200 pb-3 text-sm text-base text-gray-500">
          You can setup a new Cloud on your own machines.
        </p>
        <p class="mb-2 font-light">
          You'll need to install Node.js 14+ on the remote machine. Then run these commands:
          <!-- prettier-ignore -->
          <Prism language="shell">
            yarn add @ulixee/cloud
            # if debian linux
            sudo $(npx install-browser-deps)

            # start server on port 1818.
            # NOTE: ensure this port is open for external access
            npx @ulixee/cloud start -p 1818
          </Prism>
        </p>
        <p class="font-light">
          <br />
          Now
          <a
            href="#"
            @click.prevent="activeTab = 'Connect'"
            class="font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
            >Connect</a
          >
          to your Cloud and then navigate to it to attach the Admin Identity emitted in your
          server's console.
        </p>
        <div class="my-8 bg-gray-200 p-5 text-sm text-gray-800">
          NOTE: we publish a
          <a
            href="https://github.com/ulixee/platform#docker"
            target="_blank"
            class="font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
            >Docker</a
          >
          with Ulixee Cloud if you prefer that for your server setup.
        </div>
      </div>
    </div>
  </Modal>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Modal from '../components/Modal.vue';
import Prism from '../components/Prism.vue';
import {
  ArrowLeftIcon,
  ArrowRightCircleIcon,
  XMarkIcon,
  PhoneArrowUpRightIcon,
} from '@heroicons/vue/24/outline';
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';

const isIpRegex = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/;

export default Vue.defineComponent({
  name: 'AddCloudModal',
  components: {
    Modal,
    ArrowLeftIcon,
    XMarkIcon,
    Prism,
    ArrowRightCircleIcon,
    PhoneArrowUpRightIcon,
  },
  setup() {
    const clouds = useCloudsStore();
    const { connectToCloud } = clouds;
    return {
      activeTab: Vue.ref('Connect'),
      inputIpAddress: Vue.ref(''),
      inputCloudName: Vue.ref(''),
      hasValidAddress: Vue.ref(false),
      modal: Vue.ref<typeof Modal>(null),
      errorMessage: Vue.ref<string>(),
      connectToCloud,
    };
  },
  emits: ['close'],
  methods: {
    open() {
      this.modal.open();
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
    async connect() {
      if (!this.hasValidAddress) {
        this.errorMessage = 'Please enter a valid ip address or domain name.';
        return;
      }
      const name = this.inputCloudName;
      if (!name) {
        this.errorMessage = 'Please add a name for this cloud';
        return;
      }

      const address = this.inputIpAddress;
      try {
        await this.connectToCloud(address, name);
        this.hasValidAddress = false;
        this.inputIpAddress = '';
        this.inputCloudName = '';
      } catch (error: any) {
        this.errorMessage = error.message;
      }
    },
    onClose() {
      this.$emit('close');
      this.modal.close();
    },
  },
});
</script>
