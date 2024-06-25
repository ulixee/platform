<template>
  <div class="top-0 z-50 w-full border-b border-gray-300 bg-white py-2 px-5 text-sm">
    <div class="flex w-full flex-row">
      <ul class="flex w-full flex-row gap-x-3 divide-x">
        <li><b class="whitespace-nowrap">Ulixee Databroker</b></li>
        <li>
          <router-link :to="{ name: 'home' }" active-class="font-bold">Overview</router-link>
        </li>
        <li class="pl-3">
          <router-link :to="{ name: 'organizations' }" active-class="font-bold"
            >Organizations</router-link
          >
        </li>
        <li class="pl-3">
          <router-link :to="{ name: 'whitelist' }" active-class="font-bold">Whitelist</router-link>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';

export default Vue.defineComponent({
  components: {},
  setup() {
    return {};
  },
});
</script>
