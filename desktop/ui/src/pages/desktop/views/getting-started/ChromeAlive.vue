<template>
  <div class="h-full">
    <h2 class="mb-5 text-lg font-semibold">Replay in ChromeAlive</h2>
    <p class="font-light">
      Hero has a secret superpower. It can record every step of your interactions, along with the
      DOM, HTTP resources, variables used in your commands and more. Ulixee Desktop comes with a tool called
      <b>ChromeAlive</b> that can replay these "sessions" in a browser. <br /><br />
      This is tremendously valuable during development when you encounter unexpected page states,
      and even more so when a script breaks on a remote server.
      <br /><br />
      Here's some of what ChromeAlive can do:
    </p>

    <div class="mt-2 border-t border-gray-200 shadow">
      <dl>
        <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-4 sm:gap-4 sm:px-3">
          <dt class="text-sm font-medium text-gray-500">Timeline</dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-3 sm:mt-0">
            View every "tick" of your script timeline (paint event, mouse movement, typing, page
            load, etc).
          </dd>
          <dt class="text-sm font-medium text-gray-500">True DOM</dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-3 sm:mt-0">
            As your script replays, the DOM is reproduced exactly as it was during your script. If a
            selector doesn't work, you can use the Console tab to run querySelectors and see what
            went wrong.
          </dd>
          <dt class="text-sm font-medium text-gray-500">Selector Generator</dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-3 sm:mt-0">
            Automatically generate DOM selectors for elements. Internally creates 10k possible
            selectors. COMING SOON: suggests fixes when a selector breaks.
          </dd>
          <dt class="text-sm font-medium text-gray-500">Hero Script</dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-3 sm:mt-0">
            Step through your Hero code as the browser updates. Each step includes the internal
            arguments and results.
          </dd>
          <dt class="text-sm font-medium text-gray-500">Resources</dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-3 sm:mt-0">
            See all Hero resources, and show how Hero's man-in-the-middle corrects invalid headers.
            Includes an ability to "Search" resource bodies to locate data files.
          </dd>
          <dt class="text-sm font-medium text-gray-500">State Generator</dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-3 sm:mt-0">
            Compare DOM changes at each step of the timeline. This can be used to figure out what
            DOM changes to wait for in your code.
          </dd>
        </div>
      </dl>
    </div>

    <h3 class="text-md mt-10 mb-2 font-semibold">Hero Replays</h3>
    <p class="font-light">
      You should see a tab called
      <router-link
        to="/replays"
        class="font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
        >Hero Replays</router-link
      >
      in the sidebar. Your local ChromeAlive replays will always show up on this tab. You can also view
      replays from remote servers (Clouds) once you've connected to them.

      <br /><br />
      Go take a look at your test script and poke around ChromeAlive. You can drag the timeline in
      the address-bar, or play through your script in the <i>Hero Script</i> section of the Devtools
      toolbar.<br /><br />

      After you've played around, come back here.
    </p>

    <p
      v-if="step.isComplete"
      class="grid-row my-10 grid grid-cols-2 items-center bg-fuchsia-800/10 p-5 text-gray-700"
    >
      <span class="text-lg">Great, if you're done exploring ChromeAlive, click next: </span>
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
  name: 'GettingStartedChromeAlive',
  props: {},
  components: {
    ArrowRightCircleIcon,
    Prism,
  },
  setup() {
    const gettingStarted = useGettingStartedStore();
    const { steps } = storeToRefs(gettingStarted);
    const step = computed(() => steps.value.find(x => x.href === 'chromealive'));
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
