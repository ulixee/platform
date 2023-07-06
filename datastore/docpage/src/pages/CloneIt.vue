<template>
  <Navbar />
  <div class="Free Credits my-12 px-20">
    <div class="rounded border bg-white p-10 shadow">
      <h1 class="text-center">
        <div class="text-2xl">{{ config.name.toUpperCase() }} DATASTORE</div>
        <div class="text-8xl">CLONE IT</div>
      </h1>

      <p class="mt-5">
        You can clone this datastore to your local machine with a few simple commands:
      </p>

      <Prism language="bash">
        npx @ulixee/datastore clone 'ulx://{{ ipAddress }}:{{ port }}/{{config.datastoreId}}/{{ config.version }}'
      </Prism>

      <p class="mt-5">That's It. Now you can run it...</p>
      <Prism language="bash"> npx @ulixee/datastore start ./datastore.ts </Prism>

      <p class="mt-5">Or package and deploy it...</p>
      <Prism language="bash">
        npx @ulixee/datastore deploy ./datastore.ts -h CLOUD_NODE_YOU_HAVE_ACCESS
      </Prism>
    </div>
  </div>
</template>

<script lang="ts">
import { getCredit } from '@/lib/Utils';
import * as Vue from 'vue';
import Prism from '../components/Prism.vue';
import Navbar from '../layouts/Navbar.vue';
import { docpageConfigPromise, serverDetailsPromise } from '../main';

export default Vue.defineComponent({
  components: {
    Prism,
    Navbar,
  },
  async setup() {
    const config = await docpageConfigPromise;
    const { ipAddress, port } = await serverDetailsPromise;

    return {
      config,
      ipAddress,
      port,
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
