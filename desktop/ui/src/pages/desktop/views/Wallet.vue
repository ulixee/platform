<template>
  <div class="h-full">
    <h1 class="mb-8 mt-3 text-2xl font-semibold text-gray-900">Your Wallet</h1>
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="account of wallet.accounts"
        :key="account.address"
        class="flex flex-col ol-span-1 mb-10 divide-y divide-gray-200 rounded-lg cursor-pointer bg-white shadow-md hover:shadow-sm"
        @click.prevent="$router.push(`/wallet/${account.address}`)"
      >
        <div class="flex-grow relative flex w-full justify-between space-x-6 p-6">
          <div class="mt-2 mb-1 pb-1 text-base leading-6 text-gray-400 relative">
            <h3 class="">
              <span class="font-bold text-gray-700">{{ titleCase(account.name) }}</span>
            </h3>
            <div class="mt-1 w-full text-xs font-light text-gray-500 overflow-hidden text-ellipsis">
              {{ account.address }}
            </div>
          </div>
        </div>
        <div class="-mt-px flex divide-x divide-gray-200">
          <div class="grid-row grid basis-1/2 py-2 text-center text-xl">
            <div class="text-sm font-normal text-gray-900">
              <WalletIcon class="relative mr-1 inline h-4 align-text-bottom text-fuchsia-600" />
              Balance
              <span class="font-semibold">{{
                toArgons(account.balance + account.mainchainBalance, false)
              }}</span>
            </div>
          </div>

          <div class="grid-row grid basis-1/2 place-content-center py-2 text-center text-xl">
            <div class="text-sm font-normal text-gray-900">
              <ClockIcon class="relative mr-1 inline h-4 align-text-bottom text-fuchsia-600" />
              Pending
              <span class="font-semibold"
                >{{ toArgons(account.pendingBalanceChange, false) }}
                <slot v-if="account.heldBalance > 0n"
                  >, Hold {{ toArgons(account.heldBalance, false) }}</slot
                ></span
              >
            </div>
          </div>
        </div>
      </div>

      <div class="mb-10">
        <button
          class="group relative block h-full w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-800/90 focus:ring-offset-2"
          @click.prevent="newAccountModal.open()"
        >
          <PlusCircleIcon class="mx-auto h-12 w-12 text-gray-400" />
          <span class="mt-2 block text-sm font-semibold text-gray-900">Add an Account</span>
        </button>
      </div>
    </div>

    <h3 class="mb-1 mt-3 text-xl font-semibold text-gray-900">Your Databroker Accounts</h3>
    <p class="mt-1 mb-8 text-med text-gray-500">
      Databrokers manage payments for you so you don't have to worry about keeping an Argon wallet
      topped-up.
    </p>
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="(account, i) in wallet.brokerAccounts"
        :key="i"
        class="flex flex-col ol-span-1 mb-10 divide-y divide-gray-200 rounded-lg bg-white"
      >
        <div class="flex-grow relative flex w-full justify-between space-x-6 p-6">
          <div class="mt-2 mb-1 pb-1 text-base leading-6 text-gray-400 relative overflow-hidden">
            <h3 class="overflow-hidden text-ellipsis">
              <span v-if="account.name" class="font-bold text-gray-700">{{
                titleCase(account.name)
              }}</span>
              <span v-else class="font-bold text-gray-700  ">{{ account.userIdentity }}</span>
            </h3>
            <div class="mt-1 w-full text-xs font-light text-gray-500 overflow-hidden text-ellipsis">
              {{ account.host }}
            </div>
          </div>
        </div>
        <div class="-mt-px divide-gray-200">
          <div class="py-2 text-center text-xl">
            <div class="text-sm font-normal text-gray-900">
              <CommandLineIcon class="relative mr-1 inline h-4 align-text-bottom text-fuchsia-600" />
              Balance
              <span class="font-semibold">{{ toArgons(account.balance, false) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-10">
        <button
          class="group relative block h-full w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-800/90 focus:ring-offset-2"
          @click.prevent="newBrokerAccountModal.open()"
        >
          <PlusCircleIcon class="mx-auto h-12 w-12 text-gray-400" />
          <span class="mt-2 block text-sm font-semibold text-gray-900"
            >Connect a Databroker Account</span
          >
        </button>
      </div>
    </div>

    <div class="mx-auto max-w-none">
      <div class="mt-12 overflow-hidden rounded-lg bg-white shadow">
        <div class="border-b border-gray-200 bg-white px-4 py-5">
          <div
            class="-ml-4 -mt-2 flex flex-wrap content-end items-center justify-between border-b border-gray-200 pb-2"
          >
            <div class="mt-2 px-5">
              <h3 class="text-middle font-semibold leading-6 text-gray-900">
                <CakeIcon class="relative -top-0.5 mr-2 inline-block h-6 w-6" />
                Datastore Credits
              </h3>
              <p class="mt-1 text-sm text-gray-500">
                Credits valid for trying out a Datastore. Contact a Datastore author to request
                them.
              </p>
            </div>
          </div>
          <ul>
            <li
              v-for="credit in wallet?.credits"
              :key="credit.creditsId"
              class="flex flex-row items-stretch p-2"
            >
              <div class="basis-1/2 text-base font-light">
                Credit at {{ getDatastoreName(credit.datastoreId) }}
              </div>
              <div class="basis-1/2 text-lg">
                {{ toArgons(credit.remaining, true) }}
              </div>
            </li>
            <li v-if="!wallet?.credits?.length">
              <div class="mt-5 text-center text-gray-500">No credits available</div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  <NewAccountModal ref="newAccountModal" @added="refreshWallet()" />
  <NewBrokerAccountModal ref="newBrokerAccountModal" @added="refreshWallet()" />
</template>

<script lang="ts">
import ArgonIcon from '@/assets/icons/argon.svg';
import { toArgons, titleCase } from '@/pages/desktop/lib/utils';
import { useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { useWalletStore } from '@/pages/desktop/stores/WalletStore';
import {
  CommandLineIcon,
  WalletIcon,
  HandRaisedIcon,
  EnvelopeIcon,
  PlusCircleIcon,
  QuestionMarkCircleIcon,
  ClockIcon,
  CakeIcon,
} from '@heroicons/vue/24/outline';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import * as Vue from 'vue';
import NewAccountModal from './accounts/NewAccountModal.vue';
import NewBrokerAccountModal from './accounts/NewBrokerAccountModal.vue';

export default Vue.defineComponent({
  name: 'Wallet',
  components: {
    CommandLineIcon,
    WalletIcon,
    ArgonIcon,
    HandRaisedIcon,
    EnvelopeIcon,
    PlusCircleIcon,
    QuestionMarkCircleIcon,
    ClockIcon,
    CakeIcon,
    NewAccountModal,
    NewBrokerAccountModal
  },
  setup() {
    const walletStore = useWalletStore();
    return {
      ...storeToRefs(walletStore),
      toArgons,
      walletStore,
      newAccountModal: ref<typeof NewAccountModal>(null),
      newBrokerAccountModal: ref<typeof NewBrokerAccountModal>(null),
      titleCase,
    };
  },
  methods: {
    getDatastoreName(datastoreId: string): string {
      const datastoresStore = useDatastoreStore();
      const datastore = datastoresStore.datastoresById[datastoreId]?.summary;
      return (
        datastore?.name ??
        datastore?.scriptEntrypoint ??
        `a not-installed Datastore (${datastoreId})`
      );
    },
    refreshWallet() {
      void this.walletStore.load();
    },
  },
});
</script>
