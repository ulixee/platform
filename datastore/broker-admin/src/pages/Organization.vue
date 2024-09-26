Index.vue
<template>
  <Navbar />
  <div class="px-20">
    <h1 class="mt-5 text-2xl font-bold mb-4">Organizations -> {{ organization.name }}</h1>
    <div class="flex flex-row">
      <div class="mr-10 my-5 overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5 p-10 bg-white">

        <div class="mb-2">
          <strong>Balance (milligons):</strong> {{ organization.balance }} available, {{ organization.balanceInChannelHolds }} in channelHold
        </div>
        <div class="mb-2">
          <strong>Grant Additional Funds (milligons):</strong>
          <form @submit.prevent="grant" class="min-w-full max-w-full overflow-hidden">
            <input
              v-model="grantMilligons"
              class="shadow appearance-none border rounded w-full my-2 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="balance"
              type="number"
              placeholder="Milligons to grant" />
            <p v-if="errorMessage" class="px-1 py-2 text-sm font-semibold text-red-500">
              {{ errorMessage }}
            </p>
            <ul v-if="errorMessage" class="list-disc text-small list-inside">
              <li v-for="error in errorDetails" :key="error">{{ error }}</li>
            </ul>
            <button class="col-span-6 mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md bg-fuchsia-700 py-2.5 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800">
              Grant
            </button>
          </form>
        </div>
      </div>
      <div class="py-5">
        <div class="overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5 p-10 bg-white">
          <form @submit.prevent="add" class="min-w-full max-w-full overflow-hidden">
            <input
              v-model="name"
              class="shadow appearance-none border rounded w-full my-2 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="name"
              type="text"
              placeholder="Name" />
            <input
              v-model="identity"
              class="shadow appearance-none border rounded w-full my-2 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="identity"
              type="text"
              placeholder="Identity (eg, id1..)" />
            <p v-if="errorMessage" class="px-1 py-2 text-sm font-semibold text-red-500">
              {{ errorMessage }}
              <ul class='list-disc text-small list-inside'>
                <li v-for="error in errorDetails" :key="error">{{ error }}</li>
              </ul>
            </p>
            <button class="col-span-6 mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md bg-fuchsia-700 py-2.5 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800">
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
    <div class="overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5">
      <table class="min-w-full max-w-full divide-y divide-gray-300 overflow-hidden">
        <thead class="bg-gray-50">
          <tr class="top-12 mb-1 bg-fuchsia-800/90 pb-1 text-left font-thin shadow-md">
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
              Identity
            </th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Name</th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">
              &nbsp;
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          <tr v-if="!list.length" class="text-sm leading-loose hover:bg-gray-100/50">
            <td
              colspan="3"
              class="whitespace-nowrap py-4 pl-4 pr-3 font-light text-gray-600 sm:pl-6">
              No users found
            </td>
          </tr>
          <template v-for="user in list" :key="list.id">
            <tr class=" text-sm leading-loose hover:bg-gray-100/50">
              <td class="px-3 py-4 text-sm text-gray-500">
                {{ user.identity }}
              </td>
              <td class="whitespace-nowrap py-4 px-3 font-medium text-sm text-gray-500">
                {{ user.name }}
              </td>
              <td class="px-3 py-4 text-sm text-gray-500">
                <a @click.prevent="remove(user.identity)" class="text-red-500 cursor-pointer"
                  >Remove</a
                >
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
import { useRoute } from 'vue-router';
import Navbar from '../layouts/Navbar.vue';

export default Vue.defineComponent({
  components: {
    Navbar,
  },
  async setup() {
    const route = useRoute();

    return {
      name: Vue.ref(''),
      identity: Vue.ref(''),
      grantMilligons: Vue.ref(0n),
      errorMessage: Vue.ref(''),
      errorDetails: Vue.ref<string[]>([]),
      organization: Vue.ref<IDatabrokerAdminApiTypes['Organization.get']['result']>({
        id: route.params.id as string,
        name: '',
        balance: 0n,
        balanceInChannelHolds: 0n,
      }),
      list: Vue.ref<IDatabrokerAdminApiTypes['Organization.users']['result']>([]),
    };
  },
  created() {
    this.fetchAll();
  },
  methods: {
    async fetchAll() {
      this.organization = await client.send('Organization.get', {
        organizationId: this.$route.params.id as string,
      });
      this.list = await client.send('Organization.users', {
        organizationId: this.$route.params.id as string,
      });
    },
    async add() {
      try {
        this.errorMessage = '';
        await client.send('User.create', {
          name: this.name,
          identity: this.identity,
          organizationId: this.$route.params.id as string,
        });
      } catch (error: any) {
        this.errorMessage = error.message;
        this.errorDetails = error.errors ?? [];
        return;
      }
      this.name = '';
      this.identity = '';
      await this.fetchAll();
    },
    async grant() {
      try {
        this.errorMessage = '';
        await client.send('Organization.grant', {
          organizationId: this.$route.params.id as string,
          amount: this.grantMilligons,
        });
      } catch (error: any) {
        this.errorMessage = error.message;
        this.errorDetails = error.errors ?? [];
        return;
      }
      this.grantMilligons = 0n;
      await this.fetchAll();
    },
    async remove(identity: string) {
      await client.send('User.delete', {
        identity,
      });
      await this.fetchAll();
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
