<template>
  <div class="PlannedFeatures">
    <div v-for="release of releases" class="my-7">
      <div v-if="release.isSpacer" class="my-5 border-l border-r border-gray-400 border-dashed px-5 py-10 opacity-50">
        <div class="font-bold">PLATFORM VERSION {{release.startVersion}} - {{release.endVersion}}</div>
        <div class="italic">No specific items decided yet</div>
      </div>
      <div v-else>
        <div class="font-bold border border-slate-400 rounded-sm inline-block px-2">PLATFORM VERSION {{release.version}} <span v-if="release.heading"> - {{release.heading}}</span></div>
        <div class="border-l border-slate-400 pl-5">
          <p class="pt-4">{{release.description}}</p>
          <ul>
            <li v-for="item of release.items" class="relative border border-slate-300 bg-white my-5 p-3">
              <div class="line absolute top-6 -left-5 h-[1px] w-5 bg-slate-400"></div>
              <header>{{item[0]}}</header>
              <p v-if="item[1]">{{item[1]}}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>


<script lang="ts">
import * as Vue from "vue";
import { IMinorRelease } from '@/interfaces/IRoadmap';

interface ISpacer {
  isSpacer: boolean;
  startVersion: string;
  endVersion: string;
}

export default Vue.defineComponent({
  props: {
    data: {
      type: Object as Vue.PropType<IMinorRelease[]>,
      required: true,
    },
  },
  setup(props) {
    const releases: (IMinorRelease | ISpacer)[] = [];
    for (const release of props.data) {
      const lastRelease = releases[releases.length-1] as any;
      if (lastRelease && !lastRelease.isSpacer) {
        const currentMinorVersion = Number(release.version.split('.')[1]);
        const lastMinorVersion = Number(lastRelease.version.split('.')[1]);
        if (currentMinorVersion - lastMinorVersion > 1) {
          releases.push({ isSpacer: true, startVersion: `2.${lastMinorVersion+1}`, endVersion: `2.${currentMinorVersion-1}` });
        }
      }
      releases.push(release);
    }

    return {
      releases
    }
  }
});
</script>
