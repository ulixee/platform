<template>
  <div class="h-full">
    <h1 class="mb-8 mt-3 text-2xl font-semibold text-gray-900">Your Wallet</h1>
    <div class="mx-auto max-w-none">
      <div class="mt-8 overflow-hidden rounded-lg bg-white shadow">
        <div class="border-b border-gray-200 bg-white px-4 py-5">
          <div class="-ml-4 -mt-2 flex flex-wrap content-end items-center justify-between">
            <div class="mt-2 px-5">
              <h3 class="text-middle font-semibold leading-6 text-gray-900">
                <ArgonIcon class="relative mr-2 inline-block inline-block h-6 w-6" />
                Your Address
              </h3>
              <p class="mt-1 text-sm text-gray-500">
                Your unique Argon wallet address can be used like the "Pay to the Order of" line in
                a check. If Argon Cash is "to" the address below, it can only be added to this
                wallet.
              </p>
            </div>
            <div
              class="align-text-center m-5 flex select-all rounded-sm px-5 align-middle text-sm font-light leading-10 text-gray-700 ring-1 ring-fuchsia-700 ring-opacity-50 selection:bg-fuchsia-700/20 selection:text-gray-600"
            >
              {{ userBalance.address }}
            </div>
          </div>
        </div>
      </div>
      <div class="mt-8 overflow-hidden rounded-lg bg-white shadow">
        <div class="border-b border-gray-200 bg-white px-4 py-5">
          <div
            class="-ml-4 -mt-2 flex flex-wrap content-end items-center justify-between border-b border-gray-200 pb-2"
          >
            <div class="mt-2 px-5">
              <h3 class="text-middle font-semibold leading-6 text-gray-900">
                <WalletIcon class="relative -top-0.5 mr-2 inline-block inline-block h-6 w-6" />
                Wallet Funds
              </h3>
              <p class="mt-1 text-sm text-gray-500">
                Your wallet funds are stored on this machine only.
              </p>
            </div>
          </div>

          <ul
            class="align-text-center mt-2 divide-y divide-gray-100 align-middle text-sm font-light leading-10 text-gray-700"
          >
            <li class="flex flex-row items-stretch p-2">
              <div class="basis-1/2 text-base font-light">Cash</div>
              <div class="basis-1/2 text-lg">
                {{ toArgons(userBalance.centagonsBalance, false) }}
              </div>
            </li>
            <li
              v-for="credit in userBalance?.credits"
              :key="credit.id"
              class="flex flex-row items-stretch p-2"
            >
              <div class="basis-1/2 text-base font-light">
                Credit at {{ getDatastoreName(credit.datastoreId, credit.datastoreVersion) }}
              </div>
              <div class="basis-1/2 text-lg">
                {{ toArgons(credit.remainingBalance, true) }}
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import ArgonIcon from '@/assets/icons/argon.svg';
import { toArgons } from '@/pages/desktop/lib/utils';
import { useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { useWalletStore } from '@/pages/desktop/stores/WalletStore';
import { WalletIcon } from '@heroicons/vue/24/outline';
import { storeToRefs } from 'pinia';
import * as Vue from 'vue';

export default Vue.defineComponent({
  name: 'Wallet',
  components: { WalletIcon, ArgonIcon },
  setup() {
    const walletStore = useWalletStore();
    return {
      ...storeToRefs(walletStore),
      toArgons,
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
  },
});
</script>
