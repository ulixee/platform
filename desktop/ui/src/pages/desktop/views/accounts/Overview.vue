<template>
  <div class="flex">
    <div class="basis-2/3 pr-20">
      <div class="rounded-md bg-white shadow-inner ring-1 ring-gray-300 ring-opacity-80">
        <h4
          class="rounded-t-md font-semibold w-full bg-gray-600/90 p-2 text-center text-sm text-white"
        >
          Exchange Localchain Argons
        </h4>
        <div class="items-left flex flex-col p-5">
          <p class="font-light text-sm">
            A Localchain is a Person-to-Person payment system. To exchange money, you can create an
            Argon file either sending or requesting funds. The file can be sent however you'd like
            to the recipient, who will be able to import or approve that file in their own
            Localchain.
          </p>

          <p v-if="errorMessage" class="px-1 py-2 text-sm font-semibold text-red-500">
            {{ errorMessage }}
          </p>

          <div class="my-5">
            <div class="mb-1 whitespace-nowrap text-sm font-semibold">Exchange Type</div>
            <p class="text-sm text-gray-500">Are you sending or requesting argons?</p>
            <fieldset class="mt-4">
              <legend class="sr-only">Exchange Type</legend>
              <div class="sm:flex sm:items-center sm:space-x-10 sm:space-y-0">
                <div class="flex items-center">
                  <input
                    id="send-type"
                    type="radio"
                    value="send"
                    v-model="requestType"
                    class="h-4 w-4 border-gray-300 text-fuchsia-800 focus:ring-fuchsia-800"
                  />
                  <label
                    for="send-type"
                    class="ml-3 block text-sm font-medium leading-6 text-gray-900"
                    >Sending</label
                  >
                </div>
                <div class="flex items-center">
                  <input
                    id="request-type"
                    type="radio"
                    value="request"
                    v-model="requestType"
                    class="h-4 w-4 border-gray-300 text-fuchsia-800 focus:ring-fuchsia-800"
                  />
                  <label
                    for="request-type"
                    class="ml-3 block text-sm font-medium leading-6 text-gray-900"
                    >Requesting</label
                  >
                </div>
              </div>
            </fieldset>
          </div>

          <div class="my-5">
            <div class="mb-1 whitespace-nowrap text-sm font-semibold">Argons</div>
            <p class="text-sm text-gray-500">
              How many argons? They can be divided up to 3 decimal points.
            </p>
            <div class="relative mt-4">
              <span
                class="absolute left-3 whitespace-nowrap border border-transparent py-2 font-light text-gray-500"
                >₳</span
              >
              <input
                v-model="argons"
                type="number"
                min="0"
                step="0.001"
                placeholder="Argons"
                class="rounded-md border border-gray-300 py-2 pl-8 pr-3 placeholder-gray-400"
              />
            </div>
          </div>

          <div class="mt-5" v-if="requestType == 'send'">
            <div class="mb-1 whitespace-nowrap text-sm font-semibold">Recipient Account</div>
            <p class="text-sm text-gray-500">
              You can send argons like cash, or you can secure them so only your recipient can claim
              them.
            </p>
            <div class="relative mt-4">
              <span
                class="absolute left-3 whitespace-nowrap border border-transparent py-2 font-light text-gray-500"
                >@</span
              >

              <input
                v-model="toAddress"
                type="text"
                placeholder="Recipient Account (extra security)"
                class="rounded-md border border-gray-300 py-2 pl-8 pr-3 placeholder-gray-400 w-2/3"
              />
            </div>
          </div>

          <div class="mt-5 pt-5 border-t">
            <button
              class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md bg-gray-50 ring-1 ring-gray-300 px-3.5 py-2.5 text-sm font-semibold hover:text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
              @click="createArgons"
            >
              <ArrowRightCircleIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
              Create Argon File
            </button>
          </div>
          <div class="my-5 w-full items-center px-2" v-if="argonFile">
            <p class="font-light mb-10 text-gray-800">
              Copy/drag this ₳{{ argons }} Argon File to send to your recipient.
            </p>

            <div
              class="flex cursor-grab flex-col items-center"
              draggable="true"
              @dragstart.prevent="drag()"
            >
              <ArgfileIcon
                class="coin-shadow inline-block h-16 w-16 text-fuchsia-700"
                alt="Argon"
                @contextmenu.prevent="showContextMenu($event)"
              />
              <div class="my-2 text-center text-xs font-light">
                {{ argonFile.name }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="basis-1/3">
      <div
        class="flex flex-col items-center overflow-hidden rounded-lg bg-white shadow ring-1 ring-black ring-opacity-5"
      >
        <h4
          class="font-xl w-full bg-fuchsia-800/90 p-2 text-center text-sm font-semibold text-white"
        >
          Mainchain Argons
        </h4>
        <div class="grid min-w-fit grid-flow-row grid-cols-2 gap-1 bg-white py-3.5 text-gray-700">
          <span class="mr-3 whitespace-nowrap text-right font-light">Balance:</span>
          <span class="text-fuchsia-700"> {{ toArgons(account.mainchainBalance) }}</span>
        </div>
      </div>

      <div class="mt-5">
        <div class="flex flex-row space-x-2 px-10 justify-center">
          <button
            type="button"
            class="group inline-flex items-center rounded-full border border-fuchsia-700 bg-white p-1 text-sm font-semibold shadow-sm hover:text-white hover:bg-fuchsia-800/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
            @click.prevent="openTransferToLocalchain()"
          >
            <ArrowDownIcon class="h-8 w-8 text-fuchsia-700 group-hover:text-white" /></button
          ><button
            type="button"
            class="group inline-flex items-center rounded-full border border-fuchsia-700 bg-white p-1 text-sm font-semibold shadow-sm hover:text-white hover:bg-fuchsia-800/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
            @click.prevent="openTransferToMainchain()"
          >
            <ArrowUpIcon class="h-8 w-8 text-fuchsia-700 group-hover:text-white" />
          </button>
        </div>
        <p class="mt-1 px-3 text-sm text-gray-500 text-center">
          Move Argons between your Localchain and Mainchain.
        </p>
      </div>

      <div
        class="my-10 mt-5 flex flex-col items-center overflow-hidden rounded-lg bg-white shadow ring-1 ring-black ring-opacity-5"
      >
        <h4
          class="font-xl w-full bg-fuchsia-800/90 p-2 text-center text-sm font-semibold text-white"
        >
          Localchain Deposits
        </h4>
        <div class="grid min-w-fit grid-flow-row grid-cols-2 gap-1 bg-white py-3.5 text-gray-700">
          <span class="mr-3 whitespace-nowrap text-right font-light">Balance:</span>
          <span class="text-fuchsia-700"> {{ toArgons(account.balance) }}</span>

          <span class="mr-3 whitespace-nowrap text-right font-light">Pending:</span>
          <span class="text-fuchsia-700"> {{ toArgons(account.pendingBalanceChange) }}</span>

          <slot v-if="account.heldBalance > 0n">
            <span class="mr-3 whitespace-nowrap text-right font-light">On Hold:</span>
            <span class="text-fuchsia-700"> {{ toArgons(account.heldBalance) }}</span
            >>
          </slot>

          <span class="col-span-2 h-1 border-t border-gray-300">&nbsp;</span>
          <span class="mr-3 whitespace-nowrap text-right font-light">Net Balance:</span>

          <span class="text-fuchsia-700">{{
            toArgons(account.balance + account.pendingBalanceChange - account.heldBalance)
          }}</span>
        </div>
      </div>

      <div
        class="my-10 flex flex-col items-center divide-y divide-gray-200 overflow-hidden overflow-hidden rounded-lg rounded-lg rounded-lg bg-white shadow ring-1 ring-black ring-opacity-5"
      >
        <h4
          class="font-xl w-full bg-fuchsia-800/90 p-2 text-center text-sm font-semibold text-white"
        >
          Localchain Tax
        </h4>
        <div
          class="grid min-w-fit grid-flow-row grid-cols-2 gap-1 bg-gray-50 bg-white py-3.5 text-gray-700"
        >
          <span class="mr-3 whitespace-nowrap text-right font-light">Balance:</span>
          <span class="text-fuchsia-700"> {{ toArgons(account.tax) }}</span>

          <span class="mr-3 whitespace-nowrap text-right font-light">Pending:</span>
          <span class="text-fuchsia-700"> {{ toArgons(account.pendingTaxChange) }}</span>

          <span class="col-span-2 h-1 border-t border-gray-300">&nbsp;</span>

          <span class="mr-3 whitespace-nowrap text-right font-light">Net Balance:</span>
          <span class="basis-1/4 text-fuchsia-700">{{
            toArgons(account.tax + account.pendingTaxChange)
          }}</span>
        </div>
      </div>
    </div>
  </div>
  <ChainTransferModal ref="transferModal" :to-mainchain="openToMainchainModal" />
</template>

<script lang="ts">
import ArgfileIcon from '@/assets/icons/argfile.svg';
import ArgonIcon from '@/assets/icons/argon.svg';
import { titleCase, toArgons } from '@/pages/desktop/lib/utils';
import { IWallet, useWalletStore } from '@/pages/desktop/stores/WalletStore';
import ChainTransferModal from './ChainTransferModal.vue';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  CloudArrowUpIcon,
} from '@heroicons/vue/20/solid';
import {
  ArrowLeftIcon,
  ArrowRightCircleIcon,
  ArrowTopRightOnSquareIcon,
  ChevronRightIcon,
} from '@heroicons/vue/24/outline';
import { IArgonFileMeta } from '@ulixee/desktop-interfaces/apis';
import { storeToRefs } from 'pinia';
import * as Vue from 'vue';
import { useRoute } from 'vue-router';

export default Vue.defineComponent({
  name: 'AccountOverview',
  components: {
    ArgonIcon,
    ArrowDownIcon,
    ArrowUpIcon,
    CloudArrowUpIcon,
    ChevronUpDownIcon,
    ArrowTopRightOnSquareIcon,
    ChevronDownIcon,
    ArrowLeftIcon,
    ArrowRightCircleIcon,
    ArgfileIcon,
    ChevronRightIcon,
    ChainTransferModal,
  },
  emits: [],
  setup() {
    const route = useRoute();

    const walletStore = useWalletStore();
    const address = route.params.address as string;
    const { wallet } = storeToRefs(walletStore);

    const account = Vue.computed(
      () =>
        wallet.value.accounts.find(x => x.address === address) ?? {
          balance: 0n,
          pendingBalanceChange: 0n,
          heldBalance: 0n,
          tax: 0n,
          pendingTaxChange: 0n,
        } as IWallet['accounts'][0],
    );

    return {
      argonFile: Vue.ref<IArgonFileMeta>(null),
      argons: Vue.ref<number>(5),
      toAddress: Vue.ref<string>(null),
      errorMessage: Vue.ref<string>(),
      requestType: Vue.ref<'send' | 'request'>('send'),
      transferModal: Vue.ref<typeof ChainTransferModal>(null),
      openToMainchainModal: Vue.ref<boolean>(false),
      account,
      wallet,
      walletStore,
      titleCase,
      toArgons,
    };
  },
  methods: {
    async refresh() {
      this.walletStore.load();
    },
    openTransferToMainchain() {
      this.openToMainchainModal = true;
      this.transferModal.open();
    },
    openTransferToLocalchain() {
      this.openToMainchainModal = false;
      this.transferModal.open();
    },
    async createArgons() {
      try {
        if (this.requestType === 'request') {
          this.argonFile = await this.walletStore.createRequestArgonsFile(
            BigInt(this.argons * 1000),
          );
        } else {
          this.argonFile = await this.walletStore.createSendArgonsFile(
            BigInt(this.argons * 1000),
            this.toAddress,
            this.account.address,
          );
        }
        this.walletStore.load();
      } catch (error: any) {
        this.errorMessage = error.message.split('Error: ').pop();
        return;
      }
    },
    async drag() {
      const argonFile = { ...this.argonFile };
      await window.appBridge.send('Argon.dragAsFile', argonFile);
    },
    async showContextMenu($event) {
      const args = {
        ...this.argonFile,
        position: { x: $event.x, y: $event.y },
      };
      await window.desktopApi.send('Argon.showFileContextMenu', args);
    },
  },
  mounted() {
    void this.refresh();
  },
});
</script>
