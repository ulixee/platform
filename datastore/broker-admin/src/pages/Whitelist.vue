Index.vue
<template>
  <Navbar />
  <div class="px-20">
    <div class="flex flex-row">
      <div class="py-5">
        <div
          class="overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5 p-10 bg-white">
          <h4 class="text-reg font-bold mb-4">Add</h4>
          <form @submit.prevent="add" class="min-w-full max-w-full overflow-hidden">
            <input
              v-model="domain"
              class="shadow appearance-none border rounded my-2 w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="domain"
              type="text"
              placeholder="Domain" />
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
    </div>
    <div class="overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5">
      <table class="min-w-full max-w-full divide-y divide-gray-300 overflow-hidden">
        <thead class="bg-gray-50">
          <tr class="top-12 mb-1 bg-fuchsia-800/90 pb-1 text-left font-thin shadow-md">
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white w-[80%]">
              Domain
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
              No domains found
            </td>
          </tr>
          <template v-for="item in list" :key="item">
            <tr class="text-sm leading-loose hover:bg-gray-100/50">
              <td class="px-3 py-4 text-sm text-gray-500">
                {{ item }}
              </td>
              <td class="px-3 py-4 text-sm text-gray-500">
                <a @click.prevent="remove(item)" class="text-red-500 cursor-pointer"> Remove </a>
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

export default Vue.defineComponent({
  components: {
    Navbar,
  },
  async setup() {
    return {
      domain: Vue.ref(''),
      errorMessage: Vue.ref(''),
      errorDetails: Vue.ref<string[]>([]),
      list: Vue.ref<IDatabrokerAdminApiTypes['WhitelistedDomains.list']['result']>([]),
    };
  },
  created() {
    this.fetchAll();
  },
  methods: {
    async fetchAll() {
      this.list = await client.send('WhitelistedDomains.list', {});
    },
    async add() {
      try {
        this.errorMessage = '';
        this.errorDetails = [];
        await client.send('WhitelistedDomains.add', {
          domain: this.domain,
        });
        await this.fetchAll();
        this.domain = '';
      } catch (error: any) {
        this.errorMessage = error.message;
        this.errorDetails = error.errors ?? [];
      }
    },
    async remove(domain: string) {
      try {
        await client.send('WhitelistedDomains.delete', {
          domain,
        });
        await this.fetchAll();
      } catch (error: any) {
        this.errorMessage = error.message;
        this.errorDetails = error.errors ?? [];
      }
    },
  },
});
</script>
