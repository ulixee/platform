<template>
  <Modal
    ref="modal"
    :title="
      argonFile?.credit && datastore
        ? 'You Received Argon Credits!'
        : argonFile?.cash && isValidToAddress
        ? 'You Received Argons!'
        : 'Problem with Argons :('
    "
  >
    <div class="divider-y divider-slate-100 my-5">
      <div class="items-left my-5 flex flex-col px-3" v-if="argonFile?.credit">
        <div class="px-4 py-5 sm:px-6">
          <h3 class="text-base font-semibold leading-6 text-gray-900">Argon File</h3>
          <p class="mt-1 max-w-2xl text-sm text-gray-500">
            You received a {{ toArgons(argonFile.credit.microgons, true) }} credit
            <template v-if="datastore?.name"
              >good at a Datastore called "{{ datastore.name }}".</template
            >
            <template v-else-if="datastore?.domain"
              >good at the Datastore at "{{ datastore.domain }}".</template
            >
            <template v-else-if="datastore?.scriptEntrypoint"
              >good at the Datastore called "{{ datastore?.scriptEntrypoint }}".</template
            >
            <template v-else-if="datastore"
              >good at a Datastore with id "{{ datastore.id }}".</template
            >
            <template v-else>from a Datastore that can't be found.</template>
          </p>
        </div>
        <div class="border-t border-gray-200">
          <dl>
            <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Datastore</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {{ datastore?.name ?? datastore?.scriptEntrypoint ?? 'na' }}
              </dd>
            </div>
            <div class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Documentation</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                <a
                  href="#"
                  @click.prevent="showDatastoreDocs()"
                  class="font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
                >
                  View docs
                  <ArrowTopRightOnSquareIcon class="-mt-1 ml-2 inline h-4 text-gray-500" />
                </a>
              </dd>
            </div>
            <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Credit Value</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {{ toArgons(argonFile.credit.microgons, true) }}
              </dd>
            </div>
          </dl>
        </div>

        <div class="mt-5 flex w-full flex-row items-center gap-4">
          <button
            class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md border border-gray-400 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:border-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
            @click.prevent="modal.close()"
          >
            <XMarkIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Close
          </button>

          <button
            v-if="!isAccepted"
            class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md bg-fuchsia-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
            :class="[!datastore ? 'cursor-not-allowed bg-fuchsia-700/50' : 'hover:bg-fuchsia-600']"
            :disabled="!datastore"
            @click.prevent="acceptDatastore"
          >
            <DocumentArrowDownIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Accept
          </button>
          <span
            v-else
            class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md border-fuchsia-700 px-3.5 py-2.5 text-sm font-semibold"
          >
            <DocumentArrowDownIcon
              class="-ml-0.5 h-5 w-5 text-fuchsia-700"
              aria-hidden="true"
            />Accepted!</span
          >
        </div>
      </div>
      <div v-else-if="argonFile.cash" class="my-5 w-full items-center px-2">
        <p class="font-regular mb-10 text-gray-800" v-if="isValidToAddress">
          This Argon cash is good for {{ toArgons(argonFile.cash.centagons) }}. Click below to store
          it.
        </p>
        <p class="font-regular mb-10 text-gray-800" v-else>
          This Argon cash has been sent to a different address ({{ argonFile.cash.toAddress }}) and
          cannot be added to your wallet.
        </p>
        <div class="mt-5 flex w-full flex-row items-center gap-4">
          <button
            class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md border border-gray-400 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-500 shadow-sm hover:border-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
            @click.prevent="modal.close()"
          >
            <XMarkIcon class="-ml-0.5 h-5 w-5 text-gray-400" aria-hidden="true" />
            Close
          </button>
          <button
            v-if="!isAccepted"
            class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md bg-fuchsia-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
            @click="addToWallet"
            :class="[
              !isValidToAddress ? 'cursor-not-allowed bg-fuchsia-700/50' : 'hover:bg-fuchsia-600',
            ]"
            :disabled="!isValidToAddress"
          >
            <DocumentArrowDownIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Add to Wallet
          </button>
        </div>
      </div>
      <div v-else class="my-5 w-full items-center px-2">
        <p class="font-regular mb-10 text-gray-800">This Argon file could not be processed.</p>
      </div>
    </div>
  </Modal>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { PropType } from 'vue';
import Modal from '../components/Modal.vue';
import { DocumentArrowDownIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import IArgonFile from '@ulixee/platform-specification/types/IArgonFile';
import { toArgons } from '@/pages/desktop/lib/utils';
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline';
import { IDatastoreSummary, useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { useWalletStore } from '@/pages/desktop/stores/WalletStore';
import { storeToRefs } from 'pinia';

export default Vue.defineComponent({
  name: 'ReceiveArgonsModal',
  components: {
    Modal,
    DocumentArrowDownIcon,
    ArrowTopRightOnSquareIcon,
    XMarkIcon,
  },
  props: {
    argonFile: {
      type: Object as PropType<IArgonFile>,
      required: true,
      default: () => ({} as IArgonFile),
    },
  },
  setup(props) {
    const walletStore = useWalletStore();
    const { userBalance } = storeToRefs(walletStore);
    const datastore = Vue.ref<IDatastoreSummary>(null);
    return {
      toArgons,
      modal: Vue.ref<typeof Modal>(null),
      isValidToAddress: Vue.ref(false),
      datastore,
      userBalance,
      isAccepted: Vue.computed(() => {
        if (props.argonFile?.credit) {
          const url = props.argonFile.credit.datastoreUrl;
          return userBalance.value.credits.some(
            x => url.includes(x.creditsId) && url.includes(x.host),
          );
        }
        return false;
      }),
    };
  },
  watch: {
    async argonFile(value) {
      if (value) {
        if (value.credit) {
          const datastoresStore = useDatastoreStore();
          this.datastore = await datastoresStore.getByUrl(value.credit.datastoreUrl);
        } else if (value.cash) {
          const wallet = useWalletStore();
          this.isValidToAddress = !value.cash.toAddress || value.cash.toAddress === wallet.address;
        }
        this.open();
      }
    },
  },
  methods: {
    showDatastoreDocs() {
      const argonFile = this.argonFile;
      const version = this.datastore?.version ?? 'unknown';
      const datastoreId = this.datastore?.id ?? 'unknown';
      const url = useDatastoreStore().getDocsUrl(argonFile.credit.datastoreUrl);
      window.open(url, 'Docs' + datastoreId + version);
    },
    async acceptDatastore() {
      const argonFile = this.argonFile;
      await useDatastoreStore().installDatastoreByUrl(
        this.datastore,
        argonFile.credit.datastoreUrl,
      );
      const wallet = useWalletStore();
      wallet.saveCredits({ ...argonFile.credit });
    },
    open() {
      this.modal.open();
    },
    addToWallet() {
      const argonFile = this.argonFile;
      const wallet = useWalletStore();
      wallet.saveCash({ ...argonFile.cash });
      this.modal.close();
    },
  },
});
</script>
