<template>
  <div class="h-full">
    <h2 class="mb-5 text-lg font-semibold">Cloning</h2>
    <p class="font-light">
      Datastores have a built-in feature allowing them to be extended and combined, called
      "Cloning". Let's clone a Datastore. Ulixee Desktop includes a Datastore called Ulixee Docs
      that can search and read the Ulixee Documentation.
      <br /><br />
      Run the following command from your test project:
    </p>
    <Prism language="typescript" class="my-2" style="font-size: 0.9em">
      npx @ulixee/datastore clone "{{ docsDatastoreUrl }}" ./clone
    </Prism>
    <p class="mt-5 font-light">
      Check out your newly created Datastore in the
      <span class="mx-0.5 bg-gray-200 p-1 font-light">/clone</span> directory. Your
      <span class="font-medium">datastore.ts</span> automatically created "Passthroughs" to the
      Tables and Runners from the Ulixee Docs datastore, but the code remains private.
    </p>
    <div class="my-3 bg-gray-200 p-4 text-sm font-light text-gray-600">
      NOTE: in this case, the code isn't really private! You can explore the source code in the
      datastore/examples of our @ulixee/platform github repo.
    </div>
    <p class="mt-5 font-light">
      You might notice the <span class="font-medium">affiliateId</span> in your cloned Datastore.
      This id will give you credit for any queries (and payments) that flow through to the upstream
      Datastore. <br /><br />
    </p>
    <hr class="my-3" />
    <p class="mt-5 font-light">
      The Ulixee Docs Datastore lets you browse documentation by URL. That's useful, but it would be
      easier if we could look that documentation up by topics. Let's modify this Datastore to allow
      the user to load docs by page.

      <!-- prettier-ignore -->
      <Prism language="typescript" class="mt-2" data-line='9-11,22,28-32,62-63 '  style="font-size: 0.9em">
      import { Datastore, PassthroughRunner } from '@ulixee/datastore';
      import schemaFromJson from '@ulixee/schema/lib/schemaFromJson';
      import { string, array, object, boolean } from '@ulixee/schema';

      const datastore = new Datastore({
    /**
     * 1. Tweak the name and description.
    **/
        name: 'Ulixee Docs v2',
        description:
          'Clone of Ulixee Docs that enables search docs by tool and category instead of just by url.',
        affiliateId: 'affKapydC_q_xfh',
        remoteDatastores: {
          source: 'ulx://localhost:1818/dbx1gr99wzqqnjuesg9wza',
        },
        runners: {
          pages: new PassthroughRunner({
            remoteRunner: 'source.pages',
            schema: pages(),
          }),
          docPages: new PassthroughRunner({
            description: 'Get the methods, properties and events of each Category of the Ulixee documentation using Page and Tool names.',
            remoteRunner: 'source.docPages',
            schema: docPages(),
    /**
     * 2. Intercept the inbound requests and look up the URL for the given page.
    **/
            async onRequest(ctx) {
              const pages = await ctx.run(datastore.runners.pages, { input: { tool: ctx.input.tool } });
              const page = pages.find(x => x.name === ctx.input.pageName);
              ctx.input.url = page.link;
            },
          }),
          search: new PassthroughRunner({
            remoteRunner: 'source.search',
            schema: search(),
          }),
        },
        tables: {},
      });

      //////////// SCHEMA DEFINITIONS //////////////////

      function pages() {
        return {
          input: {
            tool: string({ enum: ['hero', 'datastore', 'cloud', 'client'] }),
          },
          output: {
            link: string({ format: 'url' }),
            name: string(),
          },
        };
      }

      function docPages() {
        return {
    /**
     * 3. Change the parameters for the Runner.
    **/
          input: {
            tool: string({ enum: ['hero', 'datastore', 'cloud', 'client'] }),
            pageName: string({ description: 'The name of the page in the docs.' }),
          },
          output: {
            type: string(),
            name: string(),
            link: string({ format: 'url' }),
            details: string({ description: 'The raw html body of the section' }),
            args: array({
              optional: true,
              element: object({
                name: string(),
                type: string(),
                optional: boolean({ optional: true }),
                description: string({ optional: true }),
              }),
            }),
            returnType: string({ optional: true }),
          },
        };
      }

      function search() {
        return {
          input: {
            query: string(),
          },
          output: {
            link: string({ format: 'url' }),
            match: string(),
          },
        };
      }

      export default datastore;

      </Prism>
    </p>

    <p class="mt-8 font-light">
      Start the Datastore locally:
      <Prism language="typescript" class="mt-2" style="font-size: 0.9em">
        npx @ulixee/datastore start ./clone/datastore.ts
      </Prism>
    </p>
    <p class="mt-5 font-light" v-if="clonedDatastoreUrl">
      Now let's test it.
      <!-- prettier-ignore -->
      <Prism language="typescript" class="mt-2" style="font-size: 0.9em">
        import Client from '@ulixee/client';

        async function query() {
          const client = new Client(`{{ clonedDatastoreUrl }}`);
          const results = await client.query(
            `SELECT * from docPages(tool => $1, feature => $2)`,
            ['hero', 'Tab'],
          );

          console.log(results);

          await client.disconnect();
        }

        query().catch(console.error);
      </Prism>
    </p>

    <div v-if="step.isComplete">
      <h5 class="text-md my-8 font-semibold">A Note About Payments</h5>
      <p class="font-light">
        If your cloned Datastore needs payment, you can add an additional fee to any upstream calls.
        You can embed a Credit or payment in your Datastore, so your users can still try out your
        new Datastore using Argon Credits. You'll just need to coordinate with the original author
        to have them grant you a Credit to embed.
      </p>
    </div>
    <p
      v-if="step.isComplete"
      class="grid-row mb-10 grid grid-cols-2 items-center bg-fuchsia-800/10 p-5 text-gray-700"
    >
      <span class="text-lg"
        >Great! That's the full guide. Please reach out to us on our
        <a
          href="https://discord.gg/tMAycnemHU"
          target="_blank"
          class="font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
          >Discord channel
        </a>
        with feedback and ideas. We're excited to build this together.</span
      >
    </p>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { computed } from 'vue';
import Prism from '../../components/Prism.vue';
import { storeToRefs } from 'pinia';
import { ArrowRightCircleIcon } from '@heroicons/vue/24/outline';
import { useGettingStartedStore } from '@/pages/desktop/stores/GettingStartedStore';
import { IDatastoresByVersion, useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';

export default Vue.defineComponent({
  name: 'GettingStartedQuery',
  props: {},
  components: {
    ArrowRightCircleIcon,
    Prism,
  },
  setup() {
    const gettingStarted = useGettingStartedStore();

    const { steps } = storeToRefs(gettingStarted);
    const step = computed(() => steps.value.find(x => x.href === 'clone'));
    const datastoreStore = useDatastoreStore();
    const { datastoresByVersion } = storeToRefs(datastoreStore);

    const docsDatastoreUrl = Vue.ref('');
    const clonedDatastoreUrl = Vue.ref('');
    function findDocsDatastore(value: IDatastoresByVersion) {
      for (const [datastoreVersionHash, entry] of Object.entries(value)) {
        if (entry.summary.name === 'Ulixee Docs' && entry.deploymentsByCloud.local) {
          docsDatastoreUrl.value = datastoreStore.getCloudAddress(
            datastoreVersionHash,
            'local',
          )?.href;
        }
        if (entry.summary.name === 'Ulixee Docs v2' && entry.deploymentsByCloud.local) {
          clonedDatastoreUrl.value = datastoreStore.getCloudAddress(
            datastoreVersionHash,
            'local',
          )?.href;
        }
      }
    }

    findDocsDatastore(datastoresByVersion.value);
    Vue.watch(datastoresByVersion.value, value => {
      findDocsDatastore(value);
    });

    return { docsDatastoreUrl, clonedDatastoreUrl, step };
  },
  methods: {},
});
</script>
