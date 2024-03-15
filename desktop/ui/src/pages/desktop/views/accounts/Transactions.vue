<template>

  <div class="overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5">
    <table class="min-w-full max-w-full divide-y divide-gray-300 overflow-hidden">
      <thead class="bg-gray-50">
        <tr class="top-12 mb-1 bg-fuchsia-800/90 pb-1 text-left font-thin shadow-md">
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
            Balance Change
          </th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Tax Change</th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
            Notebook
          </th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Status</th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Date</th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
            Details
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 bg-white">
        <tr v-if="!localchain.changes.length" class="text-sm leading-loose hover:bg-gray-100/50">
          <td colspan="7" class="whitespace-nowrap py-4 pl-4 pr-3 font-light text-gray-600 sm:pl-6">
            You don't have any transactions yet
          </td>
        </tr>
        <template v-for="(item, i) in localchain.changes" :key="i">
          <tr
            class="cursor-pointer text-sm leading-loose hover:bg-gray-100/50"
            :class="[selectedRow === i ? 'bg-gray-100' : '']"
            @click="selectedRow === i ? (selectedRow = null) : (selectedRow = i)"
          >
            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500">
              {{ toArgons(item.netBalanceChange) }}
            </td>
            <td class="px-3 py-4 text-sm font-medium text-gray-900">
              {{ toArgons(item.netTax) }}
            </td>
            <td class="px-3 py-4 text-sm text-gray-500">
              {{ item.notebookNumber }}
            </td>
            <td class="px-3 py-4 text-sm text-gray-500">
              {{ item.status }}
            </td>
            <td class="px-3 py-4 text-sm text-gray-500">
              {{ formatDate(item.timestamp) }}
            </td>
            <td class="px-3 py-4 text-sm text-gray-500">
              <span v-for="note in item.notes" class="ml-2">{{ note }}</span>
            </td>
          </tr>
          <tr v-if="selectedRow === i">
            <td
              colspan="8"
              class="max-w-full overflow-x-auto border-b border-fuchsia-800/80 p-0.5 shadow-inner shadow-fuchsia-800"
            >
              <table class="min-w-full max-w-full divide-y divide-gray-300 overflow-x-auto pl-10">
                <thead class="bg-gray-50">
                  <tr class="mb-1 pb-1">
                    <th
                      v-for="key of Object.keys(item.balanceChanges[0])"
                      scope="col"
                      class="px-3 py-3.5 text-left text-sm font-medium"
                    >
                      {{ key }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                  <tr v-for="record of item.balanceChanges">
                    <td
                      v-for="key of Object.keys(item.balanceChanges[0])"
                      class="px-3 py-4 text-sm text-gray-500"
                    >
                      {{ record[key] }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { formatDate, toArgons } from '@/pages/desktop/lib/utils';
import { useWalletStore } from '@/pages/desktop/stores/WalletStore';
import { XMarkIcon } from '@heroicons/vue/20/solid';
import { ArrowLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline';
import { storeToRefs } from 'pinia';
import * as Vue from 'vue';
import { useRoute } from 'vue-router';

export default Vue.defineComponent({
  name: 'LocalchainTransactions',
  components: {
    XMarkIcon,
    ArrowLeftIcon,
    ChevronRightIcon,
  },
  setup() {
    const route = useRoute();

    const walletStore = useWalletStore();
    const address = route.params.address as string;
    const { wallet } = storeToRefs(walletStore);

    const localchain = wallet.value.accounts.find(x => x.address === address);
    return {
      selectedRow: Vue.ref<number>(-1),
      localchain,
      toArgons,
      formatDate,
    };
  },
  methods: {},
});
</script>
