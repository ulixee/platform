<template>
  <MainLayout :showPadding="false">
    <AboveTheFold>
      <MainHeader productKey="miner">Ulixee Miner</MainHeader>
      <SubHeader>Roadmap</SubHeader>

      <p class="font-light mb-5">
        Ulixee Miner is designed to easily run and scale your production scripts across one or more clouds. They run Databoxes and, when the blockchain is turned on, will participate in a consensus algorithm to close blocks.
      </p>

      <CurrentStatus version="2.0-alpha" source="ulixee/miner" package="@ulixee/miner">
        alpha testing by community released
      </CurrentStatus>

      <div v-if="roadmap">
        <PlannedFeatures :data="Object.values(roadmap.minorReleases || {})" />
      </div>
    </AboveTheFold>

    <div v-if="roadmap" class="px-24">
      <h2 class="text-2xl mt-7 border-t border-slate-300 pt-5">Upcoming Unversioned Features</h2>
      <UnplannedFeatures :data="Object.values(roadmap.unversionedFeatures || {})" />
    </div>
  </MainLayout>
</template>

<script lang="ts">
import * as Vue from "vue";
import Data from '@/lib/Data';
import IRoadmap from '@/interfaces/IRoadmap';
import CurrentStatus from '@/components/roadmap/CurrentStatus.vue';
import PlannedFeatures from '@/components/roadmap/PlannedFeatures.vue';
import UnplannedFeatures from '@/components/roadmap/UnplannedFeatures.vue';
import { AboveTheFold, MainHeader, SubHeader } from "../components";

export default Vue.defineComponent({
  components: {
    CurrentStatus,
    PlannedFeatures,
    UnplannedFeatures,
    AboveTheFold,
    MainHeader,
    SubHeader
},
  setup() {
    return {
      roadmap: Vue.ref<IRoadmap>(),
    }
  },
  async mounted() {
    this.roadmap = await Data.fetchRoadmap('Miner');
  }
});
</script>


