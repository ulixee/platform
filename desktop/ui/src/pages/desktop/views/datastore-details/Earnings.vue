<template>
  <div
    class="flex w-1/2 flex-col items-center divide-y divide-gray-200 overflow-hidden overflow-hidden rounded-lg rounded-lg rounded-lg bg-white shadow ring-1 ring-black ring-opacity-5"
  >
    <h4 class="font-xl w-full bg-fuchsia-800/90 p-2 text-center text-sm font-semibold text-white">
      Revenue
    </h4>
    <div class="min-w-fit bg-gray-50 bg-white py-3.5 text-2xl text-gray-700 sm:w-1/2">
      <div class="flex flex-row">
        <span class="mr-3 basis-3/4 whitespace-nowrap text-right font-light">Total Earned:</span>
        <span class="basis-1/4 text-fuchsia-700">{{ revenue.earned }}</span>
      </div>
      <div class="flex flex-row">
        <span class="mr-3 basis-3/4 whitespace-nowrap text-right font-light">-Store Credits:</span>
        <span class="basis-1/4 text-fuchsia-700">{{ revenue.credits }}</span>
      </div>
      <div class="mt-2 flex flex-row border-t-2 border-gray-200 pt-2">
        <span class="mr-3 basis-3/4 whitespace-nowrap text-right font-light">Net Profits:</span>
        <span class="basis-1/4 text-fuchsia-700">{{ revenue.net }}</span>
      </div>
    </div>
  </div>

  <div
    class="ol-span-1 mt-10 w-1/2 divide-y divide-gray-200 overflow-hidden rounded-lg rounded-lg bg-white shadow ring-1 ring-black ring-opacity-5"
  >
    <h4 class="font-lg bg-fuchsia-800/90 p-2 text-center text-sm font-semibold text-white">
      Datastore Credits
    </h4>
    <div class="-mt-px flex divide-x divide-gray-200">
      <div class="grid-col grid basis-1/2 place-content-center py-2 text-center text-xl">
        <div class="text-base font-normal text-gray-900">
          Allocated:
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
    <div class="items-right -mt-px p-3 text-center">
      <button
        v-if="adminIdentity"
        type="button"
        class="ring-opacity-6 inline-flex items-center gap-x-1.5 rounded-md bg-white py-1.5 px-2.5 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-fuchsia-800 hover:ring-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
        @click.prevent="createCredit"
      >
        <InlineSvg
          class="inline-block h-4 w-4 rounded-full text-fuchsia-800"
          :src="require('@/assets/icons/argon.svg')"
        />
        Create a Free Trial Credit
      </button>
      <p v-else class="text-sm font-light text-gray-700">
        Connect your Datastore's
        <a
          href="#"
          class="font-medium text-fuchsia-900 hover:text-fuchsia-600"
          @click.prevent="attachIdentity"
        >Admin Identity</a>
        to create new Credits.
      </p>
    </div>
  </div>
  <CreditsModal
    ref="creditsModal"
    :datastore="datastore"
    :selected-cloud="selectedCloud"
    @added-credit="refreshCredits"
  />
</template>

<script lang="ts">
import * as Vue from 'vue';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  CloudArrowUpIcon,
} from '@heroicons/vue/20/solid';
import { ArrowLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline';
import { useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { useRoute } from 'vue-router';
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';
import { toArgons } from '@/pages/desktop/lib/utils';
import CreditsModal from './CreditsModal.vue';

export default Vue.defineComponent({
  name: 'Datastores',
  components: {
    CheckIcon,
    CloudArrowUpIcon,
    ChevronUpDownIcon,
    ChevronDownIcon,
    ArrowLeftIcon,
    CreditsModal,
    ChevronRightIcon,
  },
  emits: [],
  setup() {
    const route = useRoute();
    const datastoresStore = useDatastoreStore();
    const versionHash = route.params.versionHash as string;
    const { summary, cloud: selectedCloud } = datastoresStore.getWithHash(versionHash);

    const totalSpend = summary.stats.totalSpend;
    const credits = summary.stats.totalCreditSpend;
    const adminIdentity = datastoresStore.getAdminDetails(summary.versionHash, selectedCloud);

    return {
      creditsModal: Vue.ref<typeof CreditsModal>(null),
      credits: Vue.ref({
        allocated: '',
        count: 0,
        spent: toArgons(credits, true),
      }),
      revenue: Vue.ref({
        earned: toArgons(totalSpend, true),
        credits: toArgons(credits, true),
        net: toArgons(totalSpend - credits, true),
      }),
      datastore: summary,
      versionHash,
      selectedCloud,
      datastoresStore,
      adminIdentity,
    };
  },
  methods: {
    createCredit() {
      this.creditsModal.open();
    },
    async refreshCredits() {
      const client = useCloudsStore().getCloudClient(this.selectedCloud);
      const { count, issuedCredits } = await client.send('Datastore.creditsIssued', {
        datastoreVersionHash: this.versionHash,
      });
      this.credits.count = count;
      this.credits.allocated = toArgons(issuedCredits ?? 0, true);
    },
    attachIdentity() {
      this.datastoresStore.findAdminIdentity(this.versionHash);
    },
  },
  mounted() {
    void this.refreshCredits();
  },
});
</script>
