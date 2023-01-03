<template>
  <Navbar />
  <div class="App px-20 my-12">
    <div class="flex flex-row">
      <div class="w-10/12 mr-10">
        <h1 class="text-4xl">{{ config.name }} Datastore</h1>

        <p>{{ config.description }}</p>
        <h2 class="mt-5">
          Installation
          <select class="py-0" v-model="exampleType">
            <option value="sql">Ulixee SQL</option>
            <option value="stream">Ulixee Stream</option>
            <option value="postgres">Postgres</option>
          </select>
        </h2>
        <Prism language="shell" v-if="exampleType === 'sql'">
          npm install @ulixee/sql
        </Prism>
        <Prism language="shell" v-else-if="exampleType === 'stream'">
          npm install @ulixee/stream
        </Prism>
        <Prism language="shell" v-else-if="exampleType === 'postgres'">
          npm install pg
        </Prism>

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
            const stream = new Sql('ulx://');
            sql.query('SELECT * FROM testers');
          })();
        </Prism>
        <Prism language="javascript" v-if="exampleType === 'stream'">
          import Stream from '@ulixee/stream';

          (async function () {
            const stream = new Stream('ulx://');
            stream.addJob({});
          })();
        </Prism>
        <Prism language="javascript" v-if="exampleType === 'postgres'">
          import { Client } from 'pg';

          (async function () {
            const client = new Client('ulx://');
            client.query('SELECT * FROM testers');
          })();
        </Prism>

        <section v-if="tables.length" id="tables">
          <h2 class="text-2xl font-bold">Tables</h2>
          <div v-for="table of tables" class="mt-3">
            <h3 class="text-xl font-bold">{{ table.name }}</h3>
            {{ table.description }}
            
            <div class="font-bold mt-2">Columns</div>
            <Fields :schema="table.schema" />
          </div>
        </section>

        <section v-if="functions.length" id="functions">
          <h2 class="text-2xl font-bold">Functions</h2>
          <div v-for="func of functions" class="mt-3">
            <h3 class="text-xl font-bold">{{ func.name }}</h3>
            {{ func.description }}

            <div class="font-bold mt-2">Input Params</div>
            <Fields :schema="func.schema.input" />

            <div class="font-bold mt-2">Output Fields</div>
            <Fields :schema="func.schema.output" />
          </div>
        </section>

        <section v-if="crawlers.length" id="crawlers">
          <h2 class="text-2xl font-bold">Crawlers</h2>
          <div v-for="crawler of crawlers">
            <h3 class="text-xl font-bold">{{ crawler.name }}</h3>
            {{ crawler.description }}
          </div>
        </section>
      </div>
      <div class="w-2/12">
        <div class="flex flex-col text-center bg-white border rounded-sm py-2">
          <div class="text-5xl">₳{{avgPricePerQuery}}</div>
          <div class="">Avg Price Per Query</div>
        </div>
        
        <div class="mt-2">
          <em>Created:</em>
          <div>{{ createdAt.format('MMMM D, YYYY') }}</div>
        </div>
        
        <div class="mt-2">
          <em>Last Used:</em>
          <div>{{ lastUsedAt.format('MMMM D, YYYY') }}</div>
        </div>

        <div class="mt-5 font-bold">Table of Contents</div>
        <ul>
          <li v-if="tables.length"><a href="#tables">Tables</a></li>
          <li v-if="functions.length"><a href="#functions">Functions</a></li>
          <li v-if="crawlers.length"><a href="#crawlers">Crawlers</a></li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import * as Vue from 'vue';
  import Moment from 'moment';
  import Prism from './components/Prism.vue';
  import Fields from './components/Fields.vue';
  import Navbar from './components/Navbar.vue';
  import config from './data.config.json';
  import { formatCurrency } from './lib/Utils';

  export default Vue.defineComponent({
    components: {
      Prism,
      Fields,
      Navbar
    },
    setup() {
      const { tablesByName, functionsByName, crawlersByName } = config as any;
      const avgPricePerQuery = Object.values(functionsByName || {}).reduce((num, x: any) => (num + x.pricePerQuery)/2, 0);
      const createdAt = Moment(config.createdAt);
      const yesterday = Moment().subtract(1, 'day');
      const lastUsedAt = yesterday.isBefore(createdAt) ? createdAt : yesterday;
      return {
        config,
        createdAt,
        lastUsedAt,
        tables: Object.values(tablesByName || {}),
        functions: Object.values(functionsByName || {}),
        crawlers: Object.values(crawlersByName || {}),
        fields: [
          {
            name: 'test',
            type: 'boolean',
            description: 'testing',
          }
        ],
        avgPricePerQuery: formatCurrency(avgPricePerQuery as number),
        exampleType: Vue.ref('sql'),
      }
    },
  });
</script>

<style lang="scss">
.App {
  section {
    @apply mt-10;
  }
}
</style>