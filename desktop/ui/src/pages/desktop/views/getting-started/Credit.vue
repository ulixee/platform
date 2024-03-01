<template>
  <div class="h-full">
    <h2 class="mb-5 text-lg font-semibold">
      Shareable Credits
    </h2>
    <p class="font-light">
      You published a Datastore waiting for the world to use it... but people would love to try it
      before they buy it! Ulixee has a simple Credits system that allow you to create and send
      Argons to your potential users.
      <br><br>
    </p>

    <h4 class="text-md mb-2 mt-5 font-semibold">
      Argon
    </h4>
    <p class="font-light">
      Argons are the currency for Ulixee Datastores. When you create a Shareable Credit, we'll
      generate an Argon Credits "file" that you can send to your user. You can send it via Email,
      Discord, Twitter, anything.. it's up to you.
    </p>
    <h4 class="text-md mb-2 mt-5 font-semibold">
      Using Credits
    </h4>
    <p class="font-light">
      Your credit recipient just needs to download Ulixee Desktop and double-click the file. Or if
      that doesn't work for them, you can also send a link to your Datastore documentation with the
      credit embedded.
      <br><br>
      Credits can be specified in their connection string to Ulixee Client, or they can install them
      into Ulixee Desktop and have the Credits automatically applied.
    </p>
    <hr class="my-5">
    <p class="font-light">
      Let's try it. Navigate to your
      <router-link
        :to="'/datastore/' + datastoreId + '@v' + version"
        class="font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
      >
        Datastore
      </router-link>
      and click the link on the right column that says "Issue a new Store Credit".
    </p>

    <div v-if="credit">
      <hr class="my-5">
      <p class="font-light">
        Great, you created a credit. Drag it to your Desktop and then open the file. Once you accept
        it, run your query:
        <Prism language="shell">
          node ./query.js
        </Prism>
      </p>
    </div>
    <p
      v-if="step.isComplete"
      class="grid-row my-10 grid grid-cols-2 items-center bg-fuchsia-800/10 p-5 text-gray-700"
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
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { ArrowRightCircleIcon } from '@heroicons/vue/24/outline';
import { useGettingStartedStore } from '@/pages/desktop/stores/GettingStartedStore';
import {
  IDatastoresById,
  TCredit,
  useDatastoreStore,
} from '@/pages/desktop/stores/DatastoresStore';
import Prism from '../../components/Prism.vue';

export default Vue.defineComponent({
  name: 'GettingStartedCredit',
  props: {},
  components: {
    ArrowRightCircleIcon,
    Prism,
  },
  setup() {
    const gettingStarted = useGettingStartedStore();

    const { steps } = storeToRefs(gettingStarted);
    const step = computed(() => steps.value.find(x => x.href === 'credit'));

    const datastoreStore = useDatastoreStore();

    const credit = ref(null as TCredit);

    const { datastoresById } = storeToRefs(datastoreStore);

    const datastoreId = Vue.ref('tmp-ulixee-org');
    const version = Vue.ref('0.0.1');
    function setDatastoreVersion(value: IDatastoresById) {
      for (const [id, entry] of Object.entries(value)) {
        if (entry.summary.scriptEntrypoint.includes('ulixee.org.') && entry.adminIdentity) {
          datastoreId.value = id;
          version.value = entry.summary.version;
          if (entry.createdCredits.length) {
            credit.value = entry.createdCredits[0].credit;
          }
        }
      }
    }
    setDatastoreVersion(datastoresById.value);
    Vue.watch(datastoresById.value, value => {
      setDatastoreVersion(value);
    });

    return {
      credit,
      datastoreId,
      version,
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
