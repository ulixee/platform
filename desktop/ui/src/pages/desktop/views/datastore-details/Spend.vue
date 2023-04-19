<template>
  <div
    class="flex w-1/2 flex-col items-center divide-y divide-gray-200 overflow-hidden overflow-hidden rounded-lg rounded-lg rounded-lg bg-white shadow ring-1 ring-black ring-opacity-5"
  >
    <h4 class="font-xl w-full bg-fuchsia-800/90 p-2 text-center text-sm font-semibold text-white">
      Spent
    </h4>
    <div class="min-w-fit bg-gray-50 bg-white py-3.5 text-2xl text-gray-700 sm:w-1/2">
      <div class="flex flex-row">
        <span class="mr-3 basis-3/4 whitespace-nowrap text-right font-light">Total Spent:</span>
        <span class="basis-1/4 text-fuchsia-700">{{ spend.total }}</span>
      </div>
      <div class="flex flex-row">
        <span class="mr-3 basis-3/4 whitespace-nowrap text-right font-light">-Store Credits:</span>
        <span class="basis-1/4 text-fuchsia-700">{{ spend.credits }}</span>
      </div>
      <div class="mt-2 flex flex-row border-t-2 border-gray-200 pt-2">
        <span class="mr-3 basis-3/4 whitespace-nowrap text-right font-light">Net Spend:</span>
        <span class="basis-1/4 text-fuchsia-700">{{ spend.net }}</span>
      </div>
    </div>
  </div>

  <div
    class="ol-span-1 mt-10 w-1/2 divide-y divide-gray-200 overflow-hidden rounded-lg rounded-lg bg-white shadow ring-1 ring-black ring-opacity-5"
  >
    <h4 class="font-lg bg-fuchsia-800/90 p-2 text-center text-sm font-semibold text-white">
      Your Credits
    </h4>
    <div class="-mt-px flex divide-x divide-gray-200">
      <div class="grid-col grid basis-1/2 place-content-center py-2 text-center text-xl">
        <div class="text-base font-normal text-gray-900">
          Allocated
        </div>
        <div class="text-2xl text-fuchsia-700">
          {{ credits.allocated }}
        </div>
      </div>
      <div class="grid-col grid basis-1/2 place-content-center py-2 text-center text-xl">
        <div class="text-base font-normal text-gray-900">
          Spent
        </div>
        <div class="text-2xl text-fuchsia-700">
          {{ credits.spent }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { useRoute } from 'vue-router';
import { useWalletStore } from '@/pages/desktop/stores/WalletStore';
import { storeToRefs } from 'pinia';
import { toArgons } from '@/pages/desktop/lib/utils';

export default Vue.defineComponent({
  name: 'Datastores',
  components: {},
  setup() {
    const route = useRoute();
    const versionHash = route.params.versionHash as string;
    const walletStore = useWalletStore();

    const { userBalance } = storeToRefs(walletStore);

    const credits = userBalance.value.credits.filter(x => x.datastoreVersionHash === versionHash);
    let remainingMicrogons = 0;
    let allocatedMicrogons = 0;

    for (const credit of credits) {
      remainingMicrogons += credit.remainingBalance;
      allocatedMicrogons += credit.allocated;
    }
    const creditsSpent = allocatedMicrogons - remainingMicrogons;

    // Eventually add real spend
    const totalSpend = creditsSpent;

    const spend = Vue.ref({
      total: toArgons(totalSpend, true),
      credits: toArgons(creditsSpent, true),
      net: toArgons(totalSpend - creditsSpent, true),
    });

    return {
      credits: Vue.ref({
        allocated: toArgons(allocatedMicrogons, true),
        spent: toArgons(creditsSpent, true),
      }),
      spend,
    };
  },
  methods: {},
});
</script>
