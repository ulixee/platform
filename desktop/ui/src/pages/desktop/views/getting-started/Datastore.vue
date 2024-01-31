<template>
  <div class="h-full">
    <h2 class="mb-5 text-lg font-semibold">Datastore</h2>
    <p class="font-light">
      Datastores are deployable "databases" that have functions and tables that can contain any kind
      of logic you want. In many cases, a function will contain an automated browser like Hero which
      can be used to refresh the internal data tables or simply perform a function.
      <br /><br />
      Each function defines inputs and output types. This allows Ulixee to detect and notify you
      when a script returns invalid data (aka, a Hero script has broken).
      <br /><br />
      Let's convert your Hero script into a Datastore using the Hero plugin. We'll make 3 main
      changes:
    </p>
    <ol class="list my-5 ml-2 list-inside list-decimal font-light">
      <li>
        We'll wrap the script in a Extractor + Datastore.
        <ul class="list my-1 list-inside list-disc pl-5">
          <li>A Extractor is a basic queryable function in your Datastore.</li>
          <li>Our Extractor is named "docPages" (its name for queries).</li>
        </ul>
      </li>
      <li>
        Instead of <span class="font-medium italic">console.log</span>-ing our results, we'll use
        <span class="font-medium">Output.emit</span>
      </li>
      <li>We'll add a "Schema", which informs the Extractor what fields to expect.</li>
    </ol>

    <!-- prettier-ignore -->
    <Prism ref='code' language="typescript" data-line="8,15,28-31,39-49" style='font-size: 0.9em'>
      import Datastore, { Extractor } from '@ulixee/datastore';
      import { HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';
      import { string } from '@ulixee/schema';

      /**
       * 1. We wrapped the script in a Datastore.
       */
      const datastore = new Datastore({
        name: 'Tutorial',
        extractors: {

      /**
       * 1b. We created a Extractor called docsPages.
       */
          docPages: new Extractor({
            async run({ input, Hero, Output }) {
              const hero = new Hero();
              await hero.goto(`https://ulixee.org/docs/${input.tool}`);

              await hero.querySelector('.LEFTBAR').$waitForVisible();
              const links = await hero.querySelectorAll('.LEFTBAR a');

              for (const link of await links) {

      /**
       * 2. We replaced console.log with Output.
       */
                Output.emit({
                  title: await link.innerText,
                  href: await link.href
                });
              }

              await hero.close();
            },
      /**
      * 3. We defined the schema of the Extractor function.
      */
            schema: {
              input: {
                tool: string({
                  enum: ['hero', 'datastore', 'cloud', 'client']
                }),
              },
              output: {
                title: string(),
                href: string({ format: 'url' })
              }
            }
          }, HeroExtractorPlugin)
        }
      });

      export default datastore;
    </Prism>

    <p class="my-5">
      Copy this code into your
      <span class="mx-0.5 bg-gray-200 p-1 font-light">ulixee.org.ts</span> file. <br /><br />
      You'll need to install Datastores into your project.
      <!-- prettier-ignore -->
      <Prism language="shell">
        npm i --save @ulixee/datastore-plugins-hero
        npm i --save-dev @ulixee/datastore-packager
      </Prism>
      <br />
      Now start your script
      <span class="font-light text-gray-700">(NOTE: you can point at your .ts file)</span>:
      <Prism language="shell">npx @ulixee/datastore start ./ulixee.org.ts</Prism>
    </p>

    <p v-if="step.isComplete" class="my-10 border-t-2 border-fuchsia-800 pt-5">
      <span class="font-light"
        >Your Datastore is started! You can find it on the
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
      <span class="text-lg">When you're ready, let's move to the next step:</span>
      <button
        class="ml-5 inline-flex items-center gap-x-1.5 rounded-md bg-fuchsia-700 py-2.5 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
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
import { computed } from 'vue';
import Prism from '../../components/Prism.vue';
import { storeToRefs } from 'pinia';
import { ArrowRightCircleIcon } from '@heroicons/vue/24/outline';
import { useGettingStartedStore } from '@/pages/desktop/stores/GettingStartedStore';

export default Vue.defineComponent({
  name: 'GettingStartedDatastore',
  props: {},
  components: {
    ArrowRightCircleIcon,
    Prism,
  },
  setup() {
    const gettingStarted = useGettingStartedStore();
    const { steps } = storeToRefs(gettingStarted);
    const step = computed(() => steps.value.find(x => x.href === 'datastore'));
    return {
      gotoNextStep: gettingStarted.gotoNextStep,
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
