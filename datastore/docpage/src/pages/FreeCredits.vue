<template>
  <Navbar />
  <div class="FreeCredits my-12 px-20">
    <div class="bg-white border shadow rounded p-10">
      <h1 class="text-center">
        <div class="text-2xl">FLIGHTS DATASTORE</div>
        <div class="text-8xl">FREE TRIAL CREDITS</div>
      </h1>

      <div class="border-t border-b flex flex-row text-center py-10">
        <div class="w-full">
          <div class="text-8xl font-bold">₳100</div>
          Allocated
        </div>
        <div class="">
          ->
        </div>
        <div class="w-full">
          <div class="text-8xl font-bold">₳98.54</div>
          Remaining
        </div>
      </div>

      <div>
        Query Example Code
        <Prism language="javascript">
          import Client from '@ulixee/client';

          (async function run() {
            const client = new Client(`ulx://{{ipAddress}}:{{port}}/{{ config.versionHash }}`);
            const records = await client.query(`SELECT * FROM githubProjects(true) WHERE lastName = 'Clark'`);
            console.log(records);
          })().catch(error => console.log(error));
        </Prism>
      </div>

      <ul class="flex flex-row space-x-5 mt-5">
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
import config from '../data.config.json';
import { serverDetailsPromise } from '../main';

export default Vue.defineComponent({
  components: {
    Prism,
    Navbar,
  },

  async setup() {
    const { ipAddress, port } = await serverDetailsPromise;

    return {
      config,
      ipAddress,
      port,
    }
  }
});
</script>

<style lang="scss">
.Index {
  section {
    @apply mt-10;
  }
}
</style>
