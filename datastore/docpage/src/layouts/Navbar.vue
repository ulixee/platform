<template>
  <div class="border-gray-300 w-full top-0 border-b py-2 px-5 text-sm z-50 bg-white">
    <div class="w-full flex flex-row">
      <ul class="flex flex-row gap-x-3 divide-x w-full">
        <li>
          <inline-svg :src="require('@/assets/icons/datastore.svg')" class="inline" :height="20" />
          <router-link :to="{ name: 'home' }">Documentation</router-link>
        </li>
        <li class="pl-3">
          <router-link :to="{ name: 'queryExample' }">Query Example</router-link>
        </li>
        <li class="pl-3">
          <router-link :to="{ name: 'cloneIt' }">Clone It</router-link>
        </li>
        <li class="pl-3">
          <router-link :to="{ name: 'freeCredits' }">My Free Credits</router-link>
        </li>
      </ul>
      <ul class="flex flex-row whitespace-nowrap">
        <li>
          What Are Ulixee Datastores?
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
  import * as Vue from "vue";

  export default Vue.defineComponent({ });
</script>
