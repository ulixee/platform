<template>
  <Navbar />
  <div class="Free Credits my-12 px-20">
    <div class="bg-white border shadow rounded p-10">
      <h1 class="text-center">
        <div class="text-2xl">FLIGHTS DATASTORE</div>
        <div class="text-8xl">CLONE IT</div>
      </h1>

      <p class="mt-5">You can clone this datastore to your local machine with a few simple commands:</p>

      <Prism language="bash">
        npx @ulixee/datastore clone {{ config.versionHash }} -h 43.343.43:9453
      </Prism>

      <p class="mt-5">That's It. Now you can run it...</p>
      <Prism language="bash">
        npx @ulixee/datastore start {{ config.versionHash }}
      </Prism>

      <p class="mt-5">Or package and deploy it...</p>
      <Prism language="bash">
        npx @ulixee/datastore package {{ config.versionHash }}
        npx @ulixee/datastore deploy {{ config.versionHash }} -h CLOUD_NODE_YOU_HAVE_ACCESS
      </Prism>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Prism from '../components/Prism.vue';
import Navbar from '../layouts/Navbar.vue';
import config from '../data.config.json';

export default Vue.defineComponent({
  components: {
    Prism,
    Navbar,
  },
  setup() {
    return {
      config,
    }
  }
});
</script>

<style lang="scss">
.Index {
  section {
    @apply mt-10;
  }
}
</style>
