<template>
  <div class="h-full">
    <h2 class="mb-5 text-lg font-semibold">Query</h2>
    <p class="font-light">
      Datastores can be queried using standard SQL. You can even use a native postgres client in
      your language of choice.
      <br /><br />
      This means you can deploy your scraping technology in Node.js/Typescript, and continue to use
      Golang, Python, etc on your server.
      <br /><br />
      The "connection" string for your Datastore was emitted in the console when you ran<br />
      <span class="m-0.5 bg-gray-200 p-1">@ulixee/datastore start ./ulixee.org.ts</span>. It can
      also be found for each
      <router-link
        :to="'/datastore/' + datastoreId + '@v' + version + '/clouds'"
        class="font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
        >Datastore</router-link
      >
      in this app.

      <br /><br />
      Let's see how easy it is to query our Datastore with the Client library.
    </p>

    <!-- prettier-ignore -->
    <Prism language="typescript" style='font-size: 0.9em' >
      import Client from '@ulixee/client';

      async function query() {
        const client = new Client(`{{ datastoreUrl }}`);
        const results = await client.query(
          `SELECT title, href from docPages(tool => $1)
          order by title desc`,
          ['hero'],
        );

        console.log(results);

        await client.disconnect();
      }

      query().catch(console.error);
    </Prism>

    <p class="my-5">
      Copy this code into a new file called
      <span class="mx-0.5 bg-gray-200 p-1 font-light">query.ts</span>. <br /><br />
      You'll need to install the Ulixee Client into your project.
      <span class="font-light"
        >NOTE: We're accumulating a number of dependencies, but this is the only Ulixee library you
        will install in your "application" tier.</span
      >
      <!-- prettier-ignore -->
      <Prism language="shell">
        npm i --save @ulixee/client
        # build typescript again
        npx tsc -b
      </Prism>
      <br />
      Now run your file.
      <Prism language="shell"> node ./query.js </Prism>
    </p>

    <p v-if="step.isComplete" class="my-10 border-t-2 border-fuchsia-800 pt-5">
      <span class="font-light"
        >Your Datastore recorded stats about this query! Check the
        <router-link
          to="/datastores"
          class="font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
          >Datastores</router-link
        >
        tab in the sidebar.
      </span>
    </p>
    <p
      v-if="step.isComplete"
      class="grid-row mb-10 grid grid-cols-2 items-center bg-fuchsia-800/10 p-5 text-gray-700"
    >
      <span class="text-lg">Onward:</span>
      <button
        class="ml-5 inline-flex items-center gap-x-1.5 rounded-md bg-fuchsia-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
        @click.prevent="next"
      >
        Next
        <ArrowRightCircleIcon class="relative mr-1 inline w-5" />
      </button>
    </p>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { ArrowRightCircleIcon } from '@heroicons/vue/24/outline';
import { useGettingStartedStore } from '@/pages/desktop/stores/GettingStartedStore';
import { IDatastoresById, useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import Prism from '../../components/Prism.vue';

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
    const step = computed(() => steps.value.find(x => x.href === 'query'));
    const datastoreStore = useDatastoreStore();
    const version = Vue.ref('');
    const datastoreId = Vue.ref('');
    const { datastoresById } = storeToRefs(datastoreStore);

    const datastoreUrl = Vue.ref('');
    function setDatastoreUrl(value: IDatastoresById) {
      for (const [id, entry] of Object.entries(value)) {
        if (entry.summary.scriptEntrypoint.includes('ulixee.org.')) {
          const datastoreVersion = entry.summary.version;
          datastoreId.value = id;
          version.value = datastoreVersion;
          const cloudAddress = datastoreStore.getCloudAddress(id, datastoreVersion, 'local');
          datastoreUrl.value = cloudAddress.href;
        }
      }
    }
    setDatastoreUrl(datastoresById.value);
    watch(datastoresById.value, value => {
      setDatastoreUrl(value);
    });

    return {
      version,
      datastoreId,
      datastoresById,
      gotoNextStep: gettingStarted.gotoNextStep,
      datastoreUrl,
      step,
    };
  },
  methods: {
    next() {
      this.gotoNextStep(this.step.href);
    },
  },
});
</script>
