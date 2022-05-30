<template>
  <MainLayout>
    <div class="px-10 ">
      <h1 class="text-8xl">Platform Roadmap</h1>
      <p class="w-8/12 font-light">We've been working on Ulixee for the past four years… summary of our journey in one paragraph. Today we're launching Ulixee 2.0 which incorporates everything we've learned.</p>
      <div v-for="(milestone, version) of milestones" class="relative pl-20 mt-10">
        <div class="absolute top-0 left-0 w-16 h-16 leading-[4rem] text-2xl border border-stone-300 text-center rounded">v{{version}}</div>
        <h2 class="font-bold">{{milestone.heading}}</h2>
        <p class="font-extralight">{{milestone.description}}</p>
      </div>
    </div>
  </MainLayout>
</template>

<script lang="ts">
import * as Vue from "vue";
import Data from '@/lib/Data';
import IMilestones from '@/interfaces/IMilestones';

export default Vue.defineComponent({
  setup() {
    return {
      milestones: Vue.ref<IMilestones>({}),
    }
  },
  async mounted() {
    this.milestones = await Data.fetchMilestones();
  }
});
</script>
