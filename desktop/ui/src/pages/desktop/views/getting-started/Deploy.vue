<template>
  <div class="h-full">
    <h2 class="mb-5 text-lg font-semibold">
      Deploying
    </h2>
    <p class="font-light">
      So far, you've been using the Local Development Cloud that comes with Ulixee Desktop to run
      your Hero and Datastore scripts. Now let's look at how you can deploy them so they can be used
      by clients on other computers.
      <br><br>
    </p>

    <h4 class="text-md mb-2 font-semibold">
      Start a Remote Cloud
    </h4>
    <p class="mb-2 font-light">
      You'll need to install Node.js 18+ on the remote machine. Then run these commands:
      <!-- prettier-ignore -->
      <Prism language="shell">
        npm install -g @ulixee/cloud
        # if debian linux
        sudo $(npx install-browser-deps)

        # start server on port 1818.
        # NOTE: ensure this port is open for external access
        npx @ulixee/cloud start -p 1818
      </Prism>
    </p>
    <p class="mt-5 text-sm font-light text-gray-600">
      Head over to the
      <router-link
        to="/clouds"
        class="font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
      >
        Clouds
      </router-link>
      tab and click to add a Cloud.
    </p>
    <h4 class="text-md mb-2 mt-5 font-semibold">
      Admin Access
    </h4>
    <p class="font-light">
      Let's make some final changes before you upload your dbx. When you deploy a Datastore, you
      need to assign it a unique id and version. We'll add those now.
      <br><br>
      Also, to administer a Datastore, you need to provide an "Admin Identity". Admin Identities are
      asymmetric keys that permit you to upload new versions, issue credits, and modify internal
      data of your Datastore.
      <br><br>
      For this example, we'll re-use the default Admin Identity we generated on startup of Ulixee
      Desktop.

      <!-- prettier-ignore -->
      <Prism
        language="typescript"
        class="mt-2"
        data-line="9-10, 14"
        style="font-size: 0.9em; max-height:400px; overflow-x: hidden"
      >
        import Datastore, { Extractor } from '@ulixee/datastore';
        import { HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';
        import { string } from '@ulixee/schema';

        const datastore = new Datastore({
        /**
        * Assigning an id and version
        */
        id: 'docs-demo',
        version: '1.0.0',
        /**
        * Configuring admin access.
        */
        adminIdentities: ['{{ adminIdentity }}'],
        extractors: {
        docPages: new Extractor({
        basePrice: 10_000,
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

      <br>
      Now you Copy this code into your
      <span class="mx-0.5 bg-gray-200 p-1 font-light">ulixee.org.ts</span> file. <br><br>
      Now let's deploy your Datastore:
      <Prism language="shell">
        npx @ulixee/datastore deploy ./ulixee.org.ts -h {{ yourCloudAddress }}
      </Prism>
    </p>

    <p
      v-if="step.isComplete"
      class="grid-row mb-10 grid grid-cols-2 items-center bg-fuchsia-800/10 p-5 text-gray-700"
    >
      <span class="text-lg">Well done!</span>
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
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';
import Prism from '../../components/Prism.vue';

export default Vue.defineComponent({
  name: 'GettingStartedDeploy',
  props: {},
  components: {
    ArrowRightCircleIcon,
    Prism,
  },
  setup() {
    const gettingStarted = useGettingStartedStore();

    const { steps } = storeToRefs(gettingStarted);
    const step = computed(() => steps.value.find(x => x.href === 'deploy'));
    const cloudsStore = useCloudsStore();
    const { clouds } = storeToRefs(cloudsStore);

    const adminIdentity = computed(() => clouds.value.find(x => x.name === 'local')?.adminIdentity);
    const yourCloudAddress = Vue.ref('[YOUR ADDED CLOUD]');
    watch(clouds.value, value => {
      const privateCloud = value.find(x => x.type === 'private');
      if (privateCloud) {
        yourCloudAddress.value = cloudsStore.getCloudHost(privateCloud.name);
      }
    });

    return {
      adminIdentity,
      yourCloudAddress,
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
