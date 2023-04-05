<template>
  <div class="h-full">
    <h2 class="mb-5 text-lg font-semibold">Create a Hero Script</h2>
    <p class="font-light">
      Hero is an automated browser engine like Puppeteer and Playwright, but it's purpose-built for
      scraping. It can emulate real desktop versions of Chrome with built-in randomized
      fingerprints. Hero uses the browser's native DOM apis, with a few syntactic shortcuts added on
      to make your life easier.
      <br /><br />
      Let's get started by creating a simple script that can read all the pages of the Hero
      documentation.
    </p>
    <!-- prettier-ignore -->
    <Prism ref='code' language="typescript" data-prism-copy='Copy this code' style='font-size: 0.9em'>
      import Hero from '@ulixee/hero';

      async function run() {
        const hero = new Hero();
        await hero.goto('https://ulixee.org/docs/hero');

        await hero.querySelector('.LEFTBAR').$waitForVisible();
        const links = await hero.querySelectorAll('.LEFTBAR a');

        const pageNavigation = [];
        for (const link of await links) {
          pageNavigation.push({
            title: await link.innerText,
            href: await link.href
          });
        }
        console.log(pageNavigation)

        await hero.close();
      }

      run().catch(error => console.log(error));
    </Prism>

    <p class="my-5">
      Copy this code to a file called
      <span class="mx-0.5 bg-gray-200 px-2 py-1 font-light">ulixee.org.ts</span> (or .js if you
      prefer javascript). <br /><br />
      You'll need to install Hero into your project (and Typescript for this example):
      <!-- prettier-ignore -->
      <Prism language="shell">
        npm -g install yarn # if you don't already have yarn
        yarn init
        yarn add typescript --dev
        yarn add @ulixee/hero
        npx tsc init && npx tsc -b
      </Prism>
      <br />
      Now run your script:
      <Prism language="shell">node ./ulixee.org.js</Prism>
    </p>

    <p
      v-if="step.isComplete"
      class="grid-row my-10 grid grid-cols-2 items-center bg-fuchsia-800/10 p-5 text-gray-700"
    >
      <span class="text-lg">Great, let's move to the next step: </span>
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
  name: 'GettingStartedHero',
  props: {},
  components: {
    ArrowRightCircleIcon,
    Prism,
  },
  setup() {
    const gettingStarted = useGettingStartedStore();
    const { steps } = storeToRefs(gettingStarted);
    const step = computed(() => steps.value.find(x => x.href === 'hero'));
    return {
      step,
      gotoNextStep: gettingStarted.gotoNextStep,
    };
  },
  methods: {
    next() {
      return this.gotoNextStep(this.step.href);
    },
  },
});
</script>
