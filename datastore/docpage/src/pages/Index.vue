<template>
  <Navbar />
  <div class="Index my-12 px-20">
    <div class="flex flex-row">
      <div class="mr-10 w-10/12">
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
        <Prism language="shell" v-else-if="exampleType === 'postgres'"> npm install pg </Prism>

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
            stream.addJob({
              tableName: 'testers',
              fields: '*'
            });
            stream.addJob({
              tableName: 'testers',
              fields: '*'
            });
            const results = await stream.results;
          })();
        </Prism>
        <Prism language="javascript" v-if="exampleType === 'postgres'">
          import { Client } from 'pg'; 
          
          (async function () {   
            const client = new Client('ulx://');
            await client.connect();
            const response = client.query('SELECT * FROM testers');
            console.log(response.rows);
          })();
        </Prism>

        <section v-if="tables.length" id="tables">
          <h2 class="text-2xl font-bold">Tables</h2>
          <div v-for="table of tables" class="mt-3">
            <h3 class="text-xl font-bold">{{ table.name }}</h3>
            {{ table.description }}

            <div class="mt-2 font-bold">Columns</div>
            <Fields :schema="table.schema" />
          </div>
        </section>

        <section v-if="runners.length" id="runners">
          <h2 class="text-2xl font-bold">Runners</h2>
          <div v-for="runner of runners" class="mt-3">
            <h3 class="text-xl font-bold">{{ runner.name }}</h3>
            {{ runner.description }}

            <div class="mt-2 font-bold">Input Params</div>
            <Fields :schema="runner.schema.input" />

            <div class="mt-2 font-bold">Output Fields</div>
            <Fields :schema="runner.schema.output" />
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
        <div class="flex flex-col rounded-sm border bg-white py-2 text-center">
          <div class="text-5xl">₳{{ avgPricePerQuery }}</div>
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
          <li v-if="runners.length"><a href="#runners">Runners</a></li>
          <li v-if="crawlers.length"><a href="#crawlers">Crawlers</a></li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Moment from 'moment';
import Prism from '../components/Prism.vue';
import Fields from '../components/Fields.vue';
import Navbar from '../layouts/Navbar.vue';
import config from '../data.config.json';
import { formatCurrency } from '../lib/Utils';

export default Vue.defineComponent({
  components: {
    Prism,
    Fields,
    Navbar,
  },
  setup() {
    const { tablesByName, runnersByName, crawlersByName } = config as any;
    const prices: number[] = [];
    for (const runner of Object.values(runnersByName) as any[]) {
      let total = 0;
      for (const price of runner.prices) total += price.perQuery;
      prices.push(total)
    }

    const avgPricePerQuery = prices.reduce((total, price) => total + price, 0) / prices.length;
    const createdAt = Moment(config.createdAt);
    const yesterday = Moment().subtract(1, 'day');
    const lastUsedAt = yesterday.isBefore(createdAt) ? createdAt : yesterday;
    return {
      config,
      createdAt,
      lastUsedAt,
      tables: Object.values(tablesByName || {}),
      runners: Object.values(runnersByName || {}),
      crawlers: Object.values(crawlersByName || {}),
      fields: [
        {
          name: 'test',
          type: 'boolean',
          description: 'testing',
        },
      ],
      avgPricePerQuery: formatCurrency(avgPricePerQuery as number),
      exampleType: Vue.ref('sql'),
      authString: location.search.replace(/^\?/, '')
    };
  },
  mounted() {
    console.log('ROUTER: ', this.$router);
  },
  methods: {}
});
</script>

<style lang="scss">
.Index {
  section {
    @apply mt-10;
  }
}
</style>
