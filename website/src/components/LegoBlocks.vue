<template>
  <div class="z-10 BLOCKS absolute py-[8px] pt-3 w-full h-full top-12 right-0 z-10 overflow-hidden text-center">
    <div class="BLOCK-ROW justify-center">
      <LegoBlock v-for="i of rows[0]" :logo="getLogo()" />
    </div>

    <div class='BLOCK-ROW flex flex-row'>
      <div class="h-full w-6/12 flex flex-row">
        <LegoBlock v-for="i of rows[1]" :logo="getLogo()" />
      </div>
      <div class="h-full w-6/12 flex flex-row justify-end">
        <LegoBlock v-for="i of rows[1]" :logo="getLogo()" alignRight />
      </div>
    </div>

    <div class='BLOCK-ROW flex flex-row'>
      <div class="h-full w-6/12 flex flex-row relative -left-16">
        <LegoBlock v-for="i of rows[2]" :logo="getLogo()" />
      </div>
      <div class="h-full w-6/12 flex flex-row justify-end relative -right-16">
        <LegoBlock v-for="i of rows[2]" :logo="getLogo()" alignRight />
      </div>
    </div>

    <div class='BLOCK-ROW flex flex-row'>
      <div class="h-full w-6/12 flex flex-row relative">
        <LegoBlock :logo="getLogo()" />
      </div>
      <div class="h-full w-6/12 flex flex-row justify-end relative">
        <LegoBlock :logo="getLogo()" alignRight />
      </div>
    </div>

    <div v-for="i of 11" class='BLOCK-ROW flex flex-row'>
      <div class="h-full w-6/12 flex flex-row relative -left-16">
        <LegoBlock :logo="getLogo()" class='relative' :class="[i % 2 === 0 ? '-left-8' : '']" />
      </div>
      <div class="h-full w-6/12 flex flex-row justify-end relative -right-16">
        <LegoBlock :logo="getLogo()" alignRight class='relative' :class="[i % 2 === 0 ? '-right-8' : '']" />
      </div>
    </div>

    <div class="BLOCK-ROW justify-center">
      <LegoBlock v-for="i of rows[0]" :logo="getLogo()" />
    </div>
    <div class="BLOCK-ROW justify-center">
      <LegoBlock v-for="i of rows[0]" :logo="getLogo()" />
    </div>
  </div>
</template>

<script lang='ts'>
import * as Vue from "vue";
import LegoBlock from '@/components/LegoBlock.vue';
import getLogo from '@/lib/logosForHomepage';

const rows = [
  9,
  3,
  2,
  4,
  3,
  4,
  3,
  4,
  3,
  4,
  4,
  5,
  5,
];

export default Vue.defineComponent({
  components: {
    LegoBlock,
  },
  setup() {
    return {
      rows,
    }
  },
  methods: {
    getLogo,
  }
});
</script>

<style lang="scss">
.BLOCK-ROW {
  @apply flex flex-row h-[6.1923076923%] min-h-[50px]; // lg:h-[8.333333%]
  padding-bottom: 8px;
}
</style>