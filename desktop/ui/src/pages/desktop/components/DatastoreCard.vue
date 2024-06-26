<template>
  <li
    class="ol-span-1 cursor-pointer divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-md hover:shadow-sm"
    :class="{ 'opacity-50': !datastore.isStarted }"
    @click.prevent="navigate"
  >
    <div class="relative flex h-1/2 w-full items-start justify-between space-x-6 p-6">
      <div class="flex-1 overflow-hidden">
        <div class="flex items-center space-x-3">
          <h3 class="truncate text-sm font-medium text-gray-900">
            {{ datastore.name ?? datastore.scriptEntrypoint }}
          </h3>
        </div>
        <p
          v-if="datastore.description"
          class="whitespace-wrap mt-1 text-sm font-light italic text-gray-800"
        >
          {{ datastore.description }}
        </p>
        <p class="mt-1 truncate text-xs font-medium text-gray-400">
          <span class="">{{ datastore.id }}@v{{ datastore.version }} </span>
          <span class="mx-4 text-sm">•</span>
          <span class="">Created {{ formatDate(datastore.versionTimestamp) }} </span>
        </p>
      </div>

      <span
        v-if="!datastore.isStarted"
        class="absolute right-0 top-0 inline-flex items-center rounded-bl bg-gray-900 px-2.5 py-0.5 text-xs font-medium text-white"
      >Stopped</span>
    </div>
    <div class="-mt-px flex divide-x divide-gray-200">
      <div class="grid-row grid basis-1/2 py-2 text-center text-xl">
        <div class="text-sm font-normal text-gray-900">
          <HeartIcon class="relative mr-1 inline h-4 align-text-bottom text-fuchsia-600" />
          Reliability
          <span class="font-semibold"> {{ reliability }}% </span>
        </div>
      </div>

      <div class="grid-row grid basis-1/2 place-content-center py-2 text-center text-xl">
        <div class="text-sm font-normal text-gray-900">
          <ChartBarIcon class="relative mr-1 inline h-4 align-text-bottom text-fuchsia-600" />
          Queries
          <span class="font-semibold"> {{ runs }} </span>
        </div>
      </div>
    </div>
    <div class="-mt-px flex divide-x divide-gray-200">
      <div class="grid-col grid basis-1/2 place-content-center py-2 text-center text-xl">
        <div class="text-base font-normal text-gray-900">
          Total Earned
        </div>
        <div class="text-2xl font-semibold text-fuchsia-700">
          {{ earned }}
        </div>
      </div>
      <div class="grid-col grid basis-1/2 place-content-center py-2 text-center text-xl">
        <div class="text-base font-normal text-gray-900">
          Total Spent
        </div>
        <div class="text-2xl font-semibold text-fuchsia-700">
          {{ spent() }}
        </div>
      </div>
    </div>
  </li>
</template>

<script lang="ts">
import { toArgons } from '@/pages/desktop/lib/utils';
import { IDatastoreSummary } from '@/pages/desktop/stores/DatastoresStore';
import { useWalletStore } from '@/pages/desktop/stores/WalletStore';
import { ChartBarIcon, HeartIcon } from '@heroicons/vue/24/outline';
import { storeToRefs } from 'pinia';
import * as Vue from 'vue';
import { PropType } from 'vue';

export default Vue.defineComponent({
  name: 'DatastoreCard',
  props: {
    datastore: {
      type: Object as PropType<IDatastoreSummary>,
      required: true,
      // workaround for typing
      default: () => ({}) as IDatastoreSummary,
    },
  },
  components: {
    HeartIcon,
    ChartBarIcon,
  },
  setup(props) {
    const errors = props.datastore.stats.errors;
    const runs = props.datastore.stats.queries;
    const microgons = props.datastore.stats.totalSpend;
    const walletStore = useWalletStore();
    const { wallet } = storeToRefs(walletStore);

    let reliability = 100;
    if (runs > 0) {
      reliability = Math.round(1000 * ((runs - errors) / runs)) / 10;
    }
    return {
      wallet,
      runs,
      errors,
      reliability,
      earned: toArgons(microgons, true),
    };
  },
  methods: {
    navigate() {
      return this.$router.push(`/datastore/${this.datastore.id}@v${this.datastore.version}`);
    },
    formatDate(date: Date | number): string {
      if (!date) return 'now';
      if (typeof date === 'number') date = new Date(date);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    },
    spent() {
      const credits = this.wallet.credits.filter(
        x => x.datastoreId === this.datastore.id && x.datastoreVersion === this.datastore.version,
      );
      let spentCredits = 0;
      for (const credit of credits) {
        spentCredits += credit.allocated - credit.remaining;
      }
      return toArgons(spentCredits, true);
    },
  },
});
</script>
