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
            <option value="sql">Ulixee SQL</option>
            <option value="stream">Ulixee Stream</option>
            <option value="postgres">Postgres</option>
          </select>
        </h2>
        <Prism language="javascript" v-if="exampleType === 'sql'">
          import Sql from '@ulixee/sql'; 
          
          (async function () { 
            const stream = new Sql('ulx://{{ authString ? `${authString}@` : ''}}localhost:8080/{{ config.versionHash }}');
            const rows = sql.query('SELECT * FROM testers');
            console.log(rows);
          })();
        </Prism>
        <Prism language="javascript" v-if="exampleType === 'stream'">
          import Stream from '@ulixee/stream'; 
          
          (async function () { 
            const stream = new Stream('ulx://{{ authString ? `${authString}@` : ''}}localhost:8080/{{ config.versionHash }}');
            stream.addJob({
              tableName: 'testers',
              fields: '*'
            });
          })();
        </Prism>
        <Prism language="javascript" v-if="exampleType === 'postgres'">
          import PG from 'pg'; 
          
          (async function () {   
            const client = new PG.Client('ulx://');
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

export default Vue.defineComponent({
  components: {
    Prism,
    Navbar,
  },
  setup() {
    return {
      config,
      exampleType: Vue.ref('sql'),
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
