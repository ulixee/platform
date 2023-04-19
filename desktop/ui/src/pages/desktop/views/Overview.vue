<template>
  <div class="m-20 mt-20 flex flex-col content-center divide-y divide-slate-300">
    <div class="grid-col mx-auto grid h-64 w-64 place-content-center gap-4 text-center text-2xl">
      <div class="text-8xl font-bold">₳{{ balance }}</div>
      <div class="font-thin">Account Balance</div>
    </div>
    <div
      class="center flex flex-row place-content-center space-x-8 divide-x divide-slate-300 pt-20"
    >
      <div class="grid-col grid basis-2/5 place-content-center gap-4 text-center text-2xl">
        <div class="text-6xl font-bold">₳{{ spent }}</div>
        <div class="font-thin">Spent</div>
      </div>
      <div class="grid-col grid basis-2/5 place-content-center gap-4 text-center text-2xl">
        <div class="text-6xl font-bold">₳{{ earned }}</div>
        <div class="font-thin">Earned</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';

export default Vue.defineComponent({
  name: 'Overview',
  props: {},
  components: {},
  setup() {
    return {
      balance: Vue.ref<number>(100),
      spent: Vue.ref<number>(0),
      earned: Vue.ref<number>(12.67),
    };
  },
  methods: {},

  mounted() {
  },
});
</script>

<style lang="scss" scoped="scoped"></style>
