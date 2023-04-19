<template>
  <div class="top-0 z-50 w-full border-b border-gray-300 bg-white py-2 px-5 text-sm">
    <div class="flex w-full flex-row">
      <ul class="flex w-full flex-row gap-x-3 divide-x">
        <li>
          <inline-svg :src="require('@/assets/icons/datastore.svg')" class="inline" :height="20" />
          <router-link :to="{ name: 'home' }" active-class="font-medium">Documentation</router-link>
        </li>
        <li class="pl-3">
          <router-link :to="{ name: 'cloneIt' }" active-class="font-medium">Clone It</router-link>
        </li>
        <li class="pl-3" v-if="freeCredits">
          <router-link :to="{ name: 'freeCredits' }" active-class="font-medium"
            >My Free Credits</router-link
          >
        </li>
      </ul>
      <ul class="flex flex-row whitespace-nowrap">
        <li>
          <a href="https://ulixee.org/docs/datastore" target="_blank"
            >What Are Ulixee Datastores?</a
          >
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { getCredit } from '@/lib/Utils';

export default Vue.defineComponent({
  setup() {
    const hasCredit = !!getCredit();
    return { freeCredits: Vue.ref(hasCredit) };
  },
});
</script>
