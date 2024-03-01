<template>
  <div class="flex">
    <div class="basis-2/3 pr-20">
      <dl
        class="divide-y-gray-300 divide-y rounded-md bg-white shadow-inner ring-1 ring-gray-300 ring-opacity-20 ring-opacity-80"
      >
        <div class="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <dt class="text-sm font-medium text-gray-500">
            Entrypoint
          </dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
            {{ datastore.scriptEntrypoint }}
          </dd>
        </div>
        <div class="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <dt class="text-sm font-medium text-gray-500">
            Datastore Id
          </dt>
          <dd
            class="mt-1 overflow-hidden text-ellipsis text-sm text-gray-900 sm:col-span-2 sm:mt-0"
          >
            {{ datastore.id }}
          </dd>
        </div>
        <div class="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <dt class="whitespace-nowrap text-sm font-medium text-gray-500">
            Latest Version
          </dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
            {{ datastore.version }}
          </dd>
        </div>
        <div class="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <dt class="text-sm font-medium text-gray-500">
            Created
          </dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
            {{ formatDate(datastore.versionTimestamp) }}
          </dd>
        </div>
        <div class="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <dt class="text-sm font-medium text-gray-500">
            Documentation
          </dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
            <a
              href="#"
              class="font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
              @click.prevent="openDocs"
            >
              View docs<ArrowTopRightOnSquareIcon class="-mt-1 ml-2 inline h-4 text-gray-500" />
            </a>
          </dd>
        </div>
        <div v-if="!adminIdentity" class="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <dt class="text-sm font-medium text-gray-500">
            Install
          </dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
            <a
              href="#"
              class="font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
              @click.prevent="install"
            />

            <a
              v-if="!installed"
              type="button"
              class="font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
              @click.prevent="install"
            >
              <ArrowDownTrayIcon
                class="-ml-0.5 mr-2 h-5 w-5 text-gray-900 group-hover:text-gray-950"
                aria-hidden="true"
              />
              save to install list
            </a>
            <a
              v-else
              type="button"
              class="font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
              disabled
            >
              uninstall
            </a>
          </dd>
        </div>
      </dl>
      <div
        v-if="datastore.description"
        class="text-md mt-5 whitespace-pre-line rounded-md bg-white p-4 font-light text-gray-900 shadow-inner ring-1 ring-gray-300 ring-opacity-20 ring-opacity-80"
      >
        {{ datastore.description }}
      </div>
    </div>

    <div class="basis-1/3">
      <div
        class="flex flex-col items-center overflow-hidden overflow-hidden rounded-lg rounded-lg rounded-lg bg-white shadow ring-1 ring-black ring-opacity-5"
      >
        <h4
          class="font-xl w-full bg-fuchsia-800/90 p-2 text-center text-sm font-semibold text-white"
        >
          Revenue*
        </h4>
        <div
          class="grid min-w-fit grid-flow-row grid-cols-2 gap-1 bg-gray-50 bg-white py-3.5 text-gray-700"
        >
          <span class="mr-3 whitespace-nowrap text-right font-light">Total Earned:</span>
          <span class="text-fuchsia-700">{{ revenue.earned }}</span>

          <span class="mr-3 whitespace-nowrap text-right font-light">-Store Credits:</span>
          <div>
            <span class="whitespace-nowrap text-fuchsia-700">{{ revenue.credits }}</span>
            <span class="mx-1 font-thin text-gray-600">/ {{ credits.allocated }} allocated</span>
          </div>

          <span class="col-span-2 h-1 border-t border-gray-300">&nbsp;</span>
          <span class="mr-3 whitespace-nowrap text-right font-light">Net Profits:</span>

          <span class="text-fuchsia-700">{{ revenue.net }}</span>
        </div>
      </div>
      <div class="mt-2 px-5 text-center text-xs text-gray-500">
        <p v-if="adminIdentity" class="text-sm font-light text-gray-700">
          Issue a new
          <a
            href="#"
            class="font-medium text-fuchsia-900 hover:text-fuchsia-600"
            @click.prevent="createCredit"
          >
            <ArgonIcon class="text-top -mt-1 inline-block h-4 w-4 rounded-full" />
            Store Credit
          </a>
        </p>
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

      <div
        class="my-10 flex flex-col items-center divide-y divide-gray-200 overflow-hidden overflow-hidden rounded-lg rounded-lg rounded-lg bg-white shadow ring-1 ring-black ring-opacity-5"
      >
        <h4
          class="font-xl w-full bg-fuchsia-800/90 p-2 text-center text-sm font-semibold text-white"
        >
          Your Spending
        </h4>
        <div
          class="grid min-w-fit grid-flow-row grid-cols-2 gap-1 bg-gray-50 bg-white py-3.5 text-gray-700"
        >
          <span class="mr-3 whitespace-nowrap text-right font-light">Spent:</span>
          <span class="basis-1/4 text-fuchsia-700">{{ userSpending.total }}</span>

          <span class="mr-3 whitespace-nowrap text-right font-light">-Store Credits:</span>
          <div>
            <span class="whitespace-nowrap text-fuchsia-700">{{ userSpending.credits }}</span>
            <span class="mx-1 font-thin text-gray-600">/ {{ userSpending.creditsAllocated }} allocated</span>
          </div>

          <span class="col-span-2 h-1 border-t border-gray-300">&nbsp;</span>

          <span class="mr-3 whitespace-nowrap text-right font-light">Net Spend:</span>
          <span class="basis-1/4 text-fuchsia-700">{{ userSpending.net }}</span>
        </div>
      </div>
      <p class="mt-2 text-center text-xs text-gray-500">
        *Showing revenue from {{ getCloudName(selectedCloud) }}.
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
import ArgonIcon from '@/assets/icons/argon.svg';
import Prism from '@/pages/desktop/components/Prism.vue';
import { toArgons } from '@/pages/desktop/lib/utils';
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';
import { useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { useWalletStore } from '@/pages/desktop/stores/WalletStore';
import {
  ArrowDownTrayIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  CloudArrowUpIcon,
} from '@heroicons/vue/20/solid';
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  ChevronRightIcon,
} from '@heroicons/vue/24/outline';
import { storeToRefs } from 'pinia';
import * as Vue from 'vue';
import { useRoute } from 'vue-router';
import CreditsModal from './CreditsModal.vue';

export default Vue.defineComponent({
  name: 'Datastores',
  components: {
    ArgonIcon,
    ArrowDownTrayIcon,
    Prism,
    CheckIcon,
    CloudArrowUpIcon,
    ChevronUpDownIcon,
    ArrowTopRightOnSquareIcon,
    ChevronDownIcon,
    ArrowLeftIcon,
    CreditsModal,
    ChevronRightIcon,
  },
  emits: [],
  setup() {
    const route = useRoute();
    const datastoresStore = useDatastoreStore();
    const walletStore = useWalletStore();
    const cloudsStore = useCloudsStore();
    const { getCloudName } = cloudsStore;
    const { userBalance } = storeToRefs(walletStore);
    const { datastoresById } = storeToRefs(datastoresStore);
    const datastoreId = route.params.datastoreId as string;
    const version = route.params.version as string;
    const summary = datastoresStore.get(datastoreId);

    const installed = Vue.computed(() => datastoresById.value[datastoreId].isInstalled);

    const selectedCloud = datastoresStore.getCloud(datastoreId, version);
    const cloudAddress = datastoresStore.getCloudAddress(datastoreId, version, selectedCloud);

    const totalSpend = summary.stats.totalSpend;
    const credits = summary.stats.totalCreditSpend;
    const adminIdentity = datastoresStore.getAdminDetails(datastoreId, selectedCloud);

    const userCredits = userBalance.value.credits.filter(
      x => x.datastoreId === datastoreId && x.datastoreVersion === version,
    );

    let remainingCreditMicrogons = 0;
    let allocatedCreditMicrogons = 0;

    for (const credit of userCredits) {
      remainingCreditMicrogons += credit.remaining;
      allocatedCreditMicrogons += credit.allocated;
    }
    const creditsSpent = allocatedCreditMicrogons - remainingCreditMicrogons;

    // Eventually add real spend
    const userSpend = creditsSpent;

    const userSpending = Vue.ref({
      total: toArgons(userSpend, true),
      credits: toArgons(creditsSpent, true),
      creditsAllocated: toArgons(allocatedCreditMicrogons, true),
      net: toArgons(userSpend - creditsSpent, true),
    });

    return {
      creditsModal: Vue.ref<typeof CreditsModal>(null),
      credits: Vue.ref({
        allocated: '',
        count: 0,
        spent: toArgons(creditsSpent, true),
      }),
      revenue: Vue.ref({
        earned: toArgons(totalSpend, true),
        credits: toArgons(credits, true),
        net: toArgons(totalSpend - credits, true),
      }),
      userSpending,
      datastore: summary,
      version,
      selectedCloud,
      cloudAddress,
      datastoreId,
      datastoresStore,
      adminIdentity,
      getCloudName,
      installed,
    };
  },
  methods: {
    createCredit() {
      this.creditsModal.open();
    },
    async refreshCredits() {
      const client = useCloudsStore().getCloudClient(this.selectedCloud);
      const { count, issuedCredits } = await client.send('Datastore.creditsIssued', {
        version: this.version,
        id: this.datastoreId,
      });
      this.credits.count = count;
      this.credits.allocated = toArgons(issuedCredits ?? 0, true);
    },
    openDocs() {
      const version = this.datastore.version;
      this.datastoresStore.openDocs(this.datastore.id, version, this.selectedCloud);
    },
    attachIdentity() {
      this.datastoresStore.findAdminIdentity(this.datastoreId);
    },
    install() {
      this.datastoresStore.installDatastore(
        this.datastore.id,
        this.datastore.version,
        this.selectedCloud,
      );
    },
    unInstall() {
      this.datastoresStore.uninstallDatastore(
        this.datastore.id,
        this.datastore.version,
        this.selectedCloud,
      );
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
  },
  mounted() {
    void this.refreshCredits();
  },
});
</script>
