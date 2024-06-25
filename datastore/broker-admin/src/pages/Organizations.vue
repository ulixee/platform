Index.vue
<template>
  <Navbar />
  <div class="px-20">
    <div class="flex flex-row">
      <div class="py-5">
        <div
          class="overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5 p-10 bg-white">
          <h4 class="text-reg font-bold mb-4">Add an organization</h4>
          <form @submit.prevent="add" class="min-w-full max-w-full overflow-hidden">
            <input
              v-model="name"
              class="shadow appearance-none border rounded my-2 w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="name"
              type="text"
              placeholder="Name" />

            <label for="balance" class="my-2 block text-reg font-medium leading-6 text-gray-900"
              >Milligons to Grant</label
            >
            <input
              v-model="balance"
              class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="balance"
              type="number"
              placeholder="Milligons to Grant" />
            <p v-if="errorMessage" class="px-1 py-2 text-sm font-semibold text-red-500">
              {{ errorMessage }}
            </p>
            <ul v-if="errorMessage" class="list-disc text-small list-inside">
              <li v-for="error in errorDetails" :key="error">{{ error }}</li>
            </ul>
            <button
              class="col-span-6 mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md bg-fuchsia-700 py-2.5 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800">
              Add
            </button>
          </form>
        </div>
      </div>
      <div
        class="mx-10 my-5 overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5 p-10 bg-white">
        <div class="mb-2">
          <strong>Localchain Balance (milligons):</strong> {{ overview.localchainBalance }}
        </div>
        <div class="mb-2">
          <strong>Available Org Balances:</strong> {{ overview.totalOrganizationBalance }}
        </div>
        <div class="mb-2"><strong>Granted Org Balances:</strong> {{ overview.grantedBalance }}</div>
      </div>
    </div>
    <div class="overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5">
      <table class="min-w-full max-w-full divide-y divide-gray-300 overflow-hidden">
        <thead class="bg-gray-50">
          <tr class="top-12 mb-1 bg-fuchsia-800/90 pb-1 text-left font-thin shadow-md">
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Id</th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Name</th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
              Balance
            </th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
              Balance in Escrow
            </th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
              &nbsp;
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          <tr v-if="!list.length" class="text-sm leading-loose hover:bg-gray-100/50">
            <td
              colspan="6"
              class="whitespace-nowrap py-4 pl-4 pr-3 font-light text-gray-600 sm:pl-6">
              No organizations found
            </td>
          </tr>
          <template v-for="org in list" :key="list.id">
            <tr class="text-sm leading-loose hover:bg-gray-100/50">
              <td class="px-3 py-4 text-sm text-gray-500">
                {{ org.id }}
              </td>
              <td class="whitespace-nowrap py-4 px-3 font-medium text-sm text-gray-500">
                {{ org.name }}
              </td>
              <td class="px-3 py-4 text-sm font-medium text-gray-500">
                {{ toArgons(org.balance) }}
              </td>
              <td class="px-3 py-4 text-sm text-gray-500">
                {{ toArgons(org.balanceInEscrows) }}
              </td>
              <td class="px-3 py-4 text-sm text-gray-500">
                <router-link
                  :to="`/organizations/${org.id}`"
                  class="text-blue-500 hover:text-blue-700">
                  view
                </router-link>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import client from '@/lib/Client';
import { IDatabrokerAdminApiTypes } from '@ulixee/platform-specification/datastore/DatabrokerAdminApis';
import * as Vue from 'vue';
import Navbar from '../layouts/Navbar.vue';
import ArgonUtils from '@ulixee/platform-utils/lib/ArgonUtils';

export default Vue.defineComponent({
  components: {
    Navbar,
  },
  async setup() {
    return {
      name: Vue.ref(''),
      balance: Vue.ref(0),
      errorMessage: Vue.ref(''),
      errorDetails: Vue.ref<string[]>([]),
      overview: Vue.ref<IDatabrokerAdminApiTypes['System.overview']['result']>({} as any),
      list: Vue.ref<IDatabrokerAdminApiTypes['Organization.list']['result']>([]),
    };
  },
  created() {
    this.fetchAll();
  },
  methods: {
    async fetchAll() {
      this.overview = await client.send('System.overview', {});
      this.list = await client.send('Organization.list', {});
    },
    async add() {
      const balance = BigInt(this.balance);
      try {
        this.errorMessage = '';
        this.errorDetails = [];
        const { id } = await client.send('Organization.create', {
          name: this.name,
          balance,
        });
        this.list.unshift({ id, name: this.name, balance, balanceInEscrows: 0n });
        this.name = '';
        this.balance = 0;
      } catch (error: any) {
        this.errorMessage = error.message;
        this.errorDetails = error.errors ?? [];
      }
    },
    toArgons(amount: bigint) {
      return ArgonUtils.format(amount, 'milligons', 'argons');
    },
  },
});
</script>

<style lang="scss">
.Index {
  section {
    @apply mt-10;
  }
}
</style>
