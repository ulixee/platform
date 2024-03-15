<template>
  <div class="sm:flex sm:items-center sm:justify-between">
    <nav class="mt-3 flex" aria-label="Breadcrumb">
      <ol role="list" class="flex items-center space-x-4">
        <li>
          <div>
            <router-link
              class="text-2xl font-semibold text-gray-900 underline hover:text-gray-700"
              to="/wallet"
            >
              Wallet
            </router-link>
          </div>
        </li>
        <li>
          <div class="flex items-center">
            <ChevronRightIcon class="h-5 w-5 flex-shrink-0 text-gray-500" aria-hidden="true" />
            <span class="ml-4 text-xl font-semibold leading-8 text-gray-500">
              {{ titleCase(account.name) }}
            </span>
          </div>
        </li>
      </ol>
    </nav>
  </div>
  <div class="h-full">
    <div class="relative mt-5 border-b border-gray-200 pb-5 sm:pb-0">
      <div class="border-b border-gray-200 pb-5 sm:pb-0">
        <div>
          <span class="font-normal text-gray-800">Your AccountId:</span
          ><span class="ml-5 font-light text-gray-500">{{ account.address }}</span>
        </div>

        <div class="mt-1">
          <nav class="-mb-px flex space-x-8">
            <router-link
              v-for="tab in tabs"
              :key="tab.path"
              :to="{
                name: tab.name,
                params: { address: account.address },
              }"
              :class="[
                $route.name === tab.name
                  ? 'border-fuchsia-700 text-fuchsia-800'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                'group inline-flex items-center whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium',
              ]"
            >
              <component
                :is="tab.icon"
                :class="[
                  $route.name === tab.name
                    ? 'text-fuchsia-800/80'
                    : 'text-gray-500 group-hover:text-gray-700',
                  '-ml-0.5 mr-2 h-5 w-5',
                ]"
                aria-hidden="true"
              />
              <span>{{ tab.name }}</span>
            </router-link>
          </nav>
        </div>
      </div>
    </div>
    <div class="mt-8 flow-root">
      <div class="-mx-8 -my-2 overflow-x-auto">
        <div class="inline-block min-w-full px-8 py-2 align-middle">
          <router-view />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { IWallet, useWalletStore } from '@/pages/desktop/stores/WalletStore';
import {
  ArrowDownTrayIcon,
  BanknotesIcon,
  ChevronRightIcon,
  HomeIcon,
  EnvelopeIcon,
  HandRaisedIcon,
} from '@heroicons/vue/20/solid';
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline';
import { storeToRefs } from 'pinia';
import * as Vue from 'vue';
import { useRoute } from 'vue-router';
import { titleCase } from '../../lib/utils';

export default Vue.defineComponent({
  name: 'Localchain',
  components: {
    ChevronRightIcon,
    HomeIcon,
    ArrowTopRightOnSquareIcon,
    BanknotesIcon,
    EnvelopeIcon,
    HandRaisedIcon,
    ArrowDownTrayIcon,
  },
  setup() {
    const route = useRoute();
    const walletsStore = useWalletStore();
    const address = route.params.address as string;
    const { wallet } = storeToRefs(walletsStore);

    const account = Vue.computed(
      () =>
        wallet.value.accounts.find(x => x.address === address) ?? ({} as IWallet['accounts'][0]),
    );

    const tabs = [
      { name: 'Account Overview', path: 'overview', icon: HomeIcon },
      { name: 'Transactions', path: 'transactions', icon: BanknotesIcon },
    ];

    return {
      account,
      tabs,
      wallet,
      titleCase,
    };
  },
  watch: {},
  methods: {},
});
</script>
