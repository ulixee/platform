<template>
<div class="rounded-md bg-fuchsia-50 p-4 shadow-sm border border-fuchsia-200">
    <div class="flex">
      <div class="flex-shrink-0">
        <InformationCircleIcon class="h-5 w-5 text-fuchsia-500" aria-hidden="true" />
      </div>
      <div class="ml-3 flex-1 md:flex md:justify-between">
        <p class="text-sm text-fuchsia-700">The following example assumes your development environment has already been setup for Ulixee.</p>
        <p class="mt-3 text-sm md:mt-0 md:ml-6">
          <router-link to="/developer-environment" class="whitespace-nowrap font-medium text-fuchsia-700 hover:text-fuchsia-600">Learn More <span aria-hidden="true">&rarr;</span></router-link>
        </p>
      </div>
    </div>
  </div>
  </template>

<script lang="ts">
import * as Vue from 'vue';
import { InformationCircleIcon } from '@heroicons/vue/solid'

export default Vue.defineComponent({
  components: {
    InformationCircleIcon
  }
});
</script>