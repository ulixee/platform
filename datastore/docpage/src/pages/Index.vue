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
            <option value="client">Ulixee Client</option>
            <option value="stream">Ulixee Stream</option>
            <option value="postgres">Postgres</option>
          </select>
        </h2>
        <!-- prettier-ignore -->
        <Prism language="bash" v-if="exampleType === 'client'">
          npm install @ulixee/client
        </Prism>
        <!-- prettier-ignore -->
        <Prism language="bash" v-else-if="exampleType === 'stream'">
          npm install @ulixee/stream
        </Prism>
        <!-- prettier-ignore -->
        <Prism language="bash" v-else-if="exampleType === 'postgres'">
          npm install pg
        </Prism>

        <h2 class="mt-5">
          Usage Example
          <select class="py-0" v-model="exampleType">
            <option value="client">Ulixee Client</option>
            <option value="stream">Ulixee Stream</option>
            <option value="postgres">Postgres</option>
          </select>
        </h2>
        <!-- prettier-ignore -->
        <Prism language="javascript" v-if="exampleType === 'client'">
          import Client from '@ulixee/client';

          (async function () {
            const client = new Client('ulx://{{ authString ? `${authString}@` : ''}}{{ipAddress}}:{{port}}/{{config.datastoreId}}@v{{ config.version }}');
            const rows = await client.query('SELECT * FROM {{defaultExample.formatted}}',
              {{JSON.stringify(Object.values(defaultExample.args))}}
            );
            console.log(rows);
          })();
        </Prism>
        <!-- prettier-ignore -->
        <Prism language="javascript" v-if="exampleType === 'stream'">
          import Stream from '@ulixee/stream';

          (async function () {
            const stream = new Stream('ulx://{{ authString ? `${authString}@` : ''}}{{ipAddress}}:{{port}}/{{config.datastoreId}}@v{{ config.version }}');
            stream.addJob({
              {{ defaultExample.type }}Name: '{{defaultExample.name}}',
              fields: '*'
            });
            stream.addJob({
              {{ defaultExample.type }}Name: '{{defaultExample.name}}',
              fields: '*'
            });
            stream.addJob({
              {{ defaultExample.type }}Name: '{{defaultExample.name}}',
              fields: '*'
            });
            const results = await stream.results;
          })();
        </Prism>
        <!-- prettier-ignore -->
        <Prism language="javascript" v-if="exampleType === 'postgres'">
          import { Client } from 'pg';

          (async function () {
            const client = new Client('ulx://{{ authString ? `${authString}@` : ''}}{{ipAddress}}:{{port}}/{{config.datastoreId}}@v{{ config.version }}');
            await client.connect();
            const response = client.query('SELECT * FROM {{defaultExample.formatted}}',
              {{JSON.stringify(Object.values(defaultExample.args))}}
            );
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

        <section v-if="extractors.length" id="extractors">
          <h2 class="text-2xl font-bold">Extractors</h2>
          <div v-for="extractor of extractors" class="mt-3">
            <h3 class="text-xl font-bold">{{ extractor.name }}</h3>
            {{ extractor.description }}

            <div class="mt-2 font-bold">Input Params</div>
            <Fields :schema="extractor.schema.input" />

            <div class="mt-2 font-bold">Output Fields</div>
            <Fields :schema="extractor.schema.output" />
          </div>
        </section>

        <section v-if="crawlers.length" id="crawlers">
          <h2 class="text-2xl font-bold">Crawlers</h2>
          <div v-for="crawler of crawlers">
            <h3 class="text-xl font-bold">{{ crawler.name }}</h3>
            {{ crawler.description }}

            <div class="mt-2 font-bold">Input Params</div>
            <Fields :schema="crawler.schema.input" />
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
          <li v-if="extractors.length"><a href="#extractors">Extractors</a></li>
          <li v-if="crawlers.length"><a href="#crawlers">Crawlers</a></li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Moment from 'moment';
import { docpageConfigPromise, serverDetailsPromise } from '../main';
import Prism from '../components/Prism.vue';
import Fields from '../components/Fields.vue';
import Navbar from '../layouts/Navbar.vue';
import { formatCurrency, getCredit } from '../lib/Utils';

export default Vue.defineComponent({
  components: {
    Prism,
    Fields,
    Navbar,
  },
  async setup() {
    const config = await docpageConfigPromise;

    document.title = `${config.name} - Ulixee Datastore`;
    const { tablesByName, extractorsByName, crawlersByName, defaultExample } = config;
    const prices: number[] = [];
    for (const item of [
      ...Object.values(tablesByName ?? {}),
      ...Object.values(extractorsByName ?? {}),
      ...Object.values(crawlersByName ?? {}),
    ] as any[]) {
      for (const price of item.prices) {
        prices.push(price.basePrice);
      }
    }
    for (const [key, arg] of Object.entries(defaultExample.args)) {
      if (typeof arg === 'object' && 'func' in arg) {
        let result: Moment.Moment;
        if (arg.func === 'add') {
          result = Moment().add(arg.quantity, arg.units);
        } else if (arg.func === 'subtract') {
          result = Moment().subtract(arg.quantity, arg.units);
        } else {
          continue;
        }
        const entity =
          defaultExample.type === 'crawler'
            ? crawlersByName[defaultExample.name]
            : extractorsByName[defaultExample.name];
        const field = entity.schema?.input[key];
        if (!field) continue;
        if (field?.format === 'date') defaultExample.args[key] = result.format('YYYY-MM-DD');
        else if (field?.format === 'time') defaultExample.args[key] = result.format('HH:mm');
        else defaultExample.args[key] = result.toDate() as any;
      }
    }

    const { ipAddress, port } = await serverDetailsPromise;
    const avgPricePerQuery =
      prices.length === 0
        ? 0
        : prices.reduce((total, price) => total + price, 0) / prices.length / 1_000_000;

    const createdAt = Moment(config.createdAt);
    const yesterday = Moment().subtract(1, 'day');
    const lastUsedAt = yesterday.isBefore(createdAt) ? createdAt : yesterday;
    return {
      config,
      createdAt,
      lastUsedAt,
      ipAddress,
      port,
      defaultExample,
      tables: Object.values(tablesByName || {}),
      extractors: Object.values(extractorsByName || {}),
      crawlers: Object.values(crawlersByName || {}),
      avgPricePerQuery: formatCurrency(avgPricePerQuery as number),
      exampleType: Vue.ref('client'),
      authString: getCredit(),
    };
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
