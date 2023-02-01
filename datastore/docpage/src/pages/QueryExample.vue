<template>
  <Navbar />
  <div class="Free Credits my-12 px-20">
    <div class="bg-white border shadow rounded p-10">
      <h1 class="text-center">
        <div class="text-2xl">FLIGHTS DATASTORE</div>
        <div class="text-8xl">QUERY EXAMPLE</div>
      </h1>

      <h2 class="mt-5">
          Usage Example
          <select class="py-0" v-model="exampleType">
            <option value="client">Ulixee Client</option>
            <option value="stream">Ulixee Stream</option>
            <option value="postgres">Postgres</option>
          </select>
        </h2>
        <Prism language="javascript" v-if="exampleType === 'client'">
          import Client from '@ulixee/client'; 
          
          (async function () { 
            const client = new Client('ulx://{{ authString ? `${authString}@` : ''}}{{ipAddress}}:{{port}}/{{ config.versionHash }}');
            const rows = client.query('SELECT * FROM testers');
            console.log(rows);
          })();
        </Prism>
        <Prism language="javascript" v-if="exampleType === 'stream'">
          import Stream from '@ulixee/stream'; 
          
          (async function () { 
            const stream = new Stream('ulx://{{ authString ? `${authString}@` : ''}}{{ipAddress}}:{{port}}/{{ config.versionHash }}');
            stream.addJob({
              tableName: 'testers',
              fields: '*'
            });
          })();
        </Prism>
        <Prism language="javascript" v-if="exampleType === 'postgres'">
          import PG from 'pg'; 
          
          (async function () {   
            const client = new PG.Client('ulx://{{ipAddress}}:{{port}}/{{ config.versionHash }}');
            await client.connect();
            const response = client.query('SELECT * FROM testers');
            console.log(response.rows);
          })();
        </Prism>
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
      exampleType: Vue.ref('client'),
      authString: location.search.replace(/^\?/, '')
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
