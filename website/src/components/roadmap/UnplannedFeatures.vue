<template>
  <div class="UnplannedFeatures">
    <div v-for="release of data" class="my-7">
      <div class="font-bold">{{release.heading}}</div>
      <div class="">
        <p class="pt-4">{{release.description}}</p>
        <ul>
          <li v-for="item of release.items" class="relative my-5">
            <header>{{item[0]}}</header>
            <p v-if="item[1]">{{item[1]}}</p>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>


<script lang="ts">
import * as Vue from "vue";
import { IMinorRelease } from '@/interfaces/IRoadmap';

export default Vue.defineComponent({
  props: [
    'data', // IMinorReleases;
  ]
});
</script>
