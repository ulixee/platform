<template>
  <Navbar />
  <div class="FreeCredits my-12 px-20">
    <div class="rounded border bg-white p-10 shadow">
      <h1 class="text-center">
        <div class="text-2xl">{{ config.name.toUpperCase() }} DATASTORE</div>
        <div class="text-8xl">FREE TRIAL CREDITS</div>
      </h1>

      <div class="flex flex-row border-t border-b py-10 text-center">
        <div class="w-full">
          <div class="text-8xl font-bold">₳{{ credits.issuedCredits }}</div>
          Allocated
        </div>
        <div class="whitespace-nowrap text-8xl">-></div>
        <div class="w-full">
          <div class="text-8xl font-bold">₳{{ credits.balance }}</div>
          Remaining
        </div>
      </div>

      <div>
        Query Example Code
        <!-- prettier-ignore -->
        <Prism language="javascript">
          import Client from '@ulixee/client';

          (async function run() {
            const client = new Client(`ulx://{{ authString ? `${authString}@` : ''}}{{ipAddress}}:{{port}}/{{config.datastoreId}}@v{{ config.version }}`);
            const records = await client.query(`SELECT * FROM {{defaultExample.formatted}}`, {{JSON.stringify(Object.values(defaultExample.args))}});
            console.log(records);
          })().catch(error => console.log(error));
        </Prism>
      </div>

      <ul class="mt-5 flex flex-row space-x-5">
        <li>
          <router-link :to="{ name: 'home' }">View Documentation</router-link>
        </li>
        <li>
          <router-link :to="{ name: 'cloneIt' }">Clone It</router-link>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Prism from '../components/Prism.vue';
import Navbar from '../layouts/Navbar.vue';
import { docpageConfigPromise, serverDetailsPromise } from '../main';
import IDocpageConfig from '@ulixee/datastore-packager/interfaces/IDocpageConfig';
import { getCredit } from '@/lib/Utils';

export default Vue.defineComponent({
  components: {
    Prism,
    Navbar,
  },

  async setup() {
    const config = await docpageConfigPromise;
    const { ipAddress, port } = await serverDetailsPromise;
    const credits = Vue.ref({ balance: 0, issuedCredits: 0 });
    const authString = getCredit()!;

    try {
      const url = new URL(location.href);
      url.search = `?${authString}`;
      const result = await fetch(url.href, {
        headers: { accept: 'application/json' },
        method: 'GET',
      });

      const json = await result.json();
      if (json) {
        const issuedCredits = Number(json.issuedCredits?.value ?? 0);
        const balance = Number(json.balance?.value ?? 0);
        if (issuedCredits) {
          credits.value.issuedCredits =
            issuedCredits > 0 ? Math.round((1000 * Number(issuedCredits)) / 1_000_000) / 1000 : 0;
        }
        if (!!balance) {
          credits.value.balance = balance > 0 ? Math.round((1000 * balance) / 1_000_000) / 1000 : 0;
        }
      }
    } catch (error) {
      console.error(error);
    }

    return {
      authString,
      config,
      defaultExample: (config as unknown as IDocpageConfig).defaultExample,
      ipAddress,
      port,
      credits,
    };
  },

  async mounted() {},
});
</script>

<style lang="scss">
.Index {
  section {
    @apply mt-10;
  }
}
</style>
