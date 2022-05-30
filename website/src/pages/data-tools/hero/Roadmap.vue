<template>
  <MainLayout :showPadding="false">
    <AboveTheFold>
      <MainHeader productKey="hero">Ulixee Hero</MainHeader>
      <SubHeader>Roadmap</SubHeader>

      <p class="font-light mb-5">
        The current version avoids most bot blockers. Programming interface uses a W3C spec “awaited” DOM. Model records sequential commands with full “playback support”. The latest version focused on waiting for “Page states” and creating flows to react to and address to states.
      </p>

      <CurrentStatus version="2.0-alpha" source="ulixee/hero" package="@ulixee/hero">
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
    AboveTheFold, MainHeader, SubHeader,
  },
  setup() {
    return {
      roadmap: Vue.ref<IRoadmap>(),
    }
  },
  async mounted() {
    this.roadmap = await Data.fetchRoadmap('Hero');
  }
});
</script>


