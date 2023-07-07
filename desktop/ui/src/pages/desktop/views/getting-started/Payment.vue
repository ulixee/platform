<template>
  <div class="h-full">
    <h2 class="mb-5 text-lg font-semibold">Payment</h2>
    <p class="mb-5 font-light">
      Datastores support payments per-query out of the box. You have full control to set prices per
      query on the entire Datastore, or for each Table, Extractor, etc contained within.
      <br /><br />
      Ulixee uses a currency called the Argon. The Argon has several unique properties, including an
      ability to transact Peer-to-Peer for units as small as one-millionth of an Argon (1 microgon)
      with extremely low fees. Argons are worth approximately 1 US Dollar.
      <br /><br />
      We're currently finishing up the legal framework around allowing you to earn and sell Argons.
      In the interim, we'll show you how to use the fully operational credits system.
      <br /><br />
      Let's modify our Datastore to add a per-query price of ~1 US cent:
    </p>

    <!-- prettier-ignore -->
    <Prism
      language="typescript"
      class='mt-2'
      data-line='13'
      style="font-size: 0.9em"
    >
      import Datastore, { Extractor } from '@ulixee/datastore';
      import { HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';
      import { string } from '@ulixee/schema';

      const datastore = new Datastore({
        extractors: {
          docPages: new Extractor({
            /**
            * Here's all we do to enable payments of ~1 US cent per use of `docPages`.
            *
            * The pricing is in microgons (one-millionth of an Argon):
            */
            pricePerQuery: 10_000,
            async run({ input, Hero, Output }) {
              const hero = new Hero();
              await hero.goto(`https://ulixee.org/docs/${input.tool}`);

              await hero.querySelector('.LEFTBAR').$waitForVisible();
              const links = await hero.querySelectorAll('.LEFTBAR a');

              for (const link of await links) {
                Output.emit({
                  title: await link.innerText,
                  href: await link.href
                });
              }

              await hero.close();
            },
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
      <br />
      Now re-start your script:
      <Prism language="shell"> npx @ulixee/datastore start ./ulixee.org.ts </Prism>
    </p>

    <p v-if="step.isComplete" class="my-10 border-t-2 border-fuchsia-800 pt-5 font-light">
      When you view your auto-generated
      <a
        href="#"
        class="font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
        @click.prevent="openDocs()"
        >Documentation</a
      >, you'll see that your price is set.
      <br />
      If you retry your query now, you should see an error requiring payment!
    </p>
    <p
      v-if="step.isComplete"
      class="grid-row mb-10 grid grid-cols-2 items-center bg-fuchsia-800/10 p-5 text-gray-700"
    >
      <span class="text-lg">Click next when you're ready:</span>
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
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { ArrowRightCircleIcon } from '@heroicons/vue/24/outline';
import { useGettingStartedStore } from '@/pages/desktop/stores/GettingStartedStore';
import Prism from '../../components/Prism.vue';
import { IDatastoresById, useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';

export default Vue.defineComponent({
  name: 'GettingStartedPayment',
  props: {},
  components: {
    ArrowRightCircleIcon,
    Prism,
  },
  setup() {
    const gettingStarted = useGettingStartedStore();
    const { steps } = storeToRefs(gettingStarted);
    const step = computed(() => steps.value.find(x => x.href === 'payment'));
    const datastoreStore = useDatastoreStore();
    const datastoreId = Vue.ref('');
    const version = Vue.ref('');
    const { datastoresById } = storeToRefs(datastoreStore);

    function setDatastoreId(value: IDatastoresById) {
      for (const [id, entry] of Object.entries(value)) {
        if (entry.summary.scriptEntrypoint.includes('ulixee.org.')) {
          version.value = entry.summary.version;
          datastoreId.value = id;
        }
      }
    }
    setDatastoreId(datastoresById.value);
    Vue.watch(datastoresById.value, value => {
      setDatastoreId(value);
    });

    return {
      version,
      datastoreId,
      datastoreStore,
      gotoNextStep: gettingStarted.gotoNextStep,
      step,
    };
  },
  methods: {
    next() {
      this.gotoNextStep(this.step.href);
    },
    openDocs() {
      this.datastoreStore.openDocs(this.datastoreId, this.version, 'local');
    },
  },
});
</script>
