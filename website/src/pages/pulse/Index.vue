<template>
  <div class='ReportIndex Page pt-12 text-center'>
    <div class='BOX m-3 mt-4'>
      <h1 class='text-8xl pt-5 pb-3'>THE ULIXEE PULSE</h1>

      <div class='text-center border-t border-b border-slate-300 py-3 my-2 text-slate-400' style='box-shadow: inset 0 1px 0 white, 0 1px 0 white'>
        Last Updated {{ lastUpdatedAt }}
      </div>

      <p class='text-slate-500 py-5'>
        Ulixee Pulse assembles the latest stats and news across the network. It is updated daily at 00:01 GMT.
      </p>
    </div>

    <div class='grid grid-cols-3 gap-3 px-3'>
      <div class='BOX h-44'>
        <div class='Numbers'>0</div>
        <label>DAILY GDP</label>
      </div>
      <div class='BOX h-44'>
        <div class='Numbers'>0</div>
        <label>ARGONS IN CIRCULATION</label>
      </div>
      <div class='BOX h-44'>
        <div class='Numbers'>0</div>
        <label>CPI SCORE</label>
      </div>
      <div class='BOX h-44 col-span-1'>
        <div class='Numbers'>0</div>
        <label>LOCALCHAINS</label>
      </div>
      <div class='BOX h-44 col-span-2'>
        <div class='Numbers'>₳1.00 <span>=</span> $1.00</div>
        <label>ARGON TO DOLLAR EXCHANGE RATE</label>
      </div>
    </div>

    <div class='BOX min-h-80 m-3'>
      <inline-svg :src='require("@/assets/map.svg")' width='100%' />
    </div>
    <Paywall class='relative z-20' />
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import moment from 'moment';
import Paywall from '@/components/Paywall.vue';

export default Vue.defineComponent({
  components: {
    Paywall,
  },
  setup() {
    const lastUpdatedAt = moment().format("dddd, MMMM Do YYYY");

    return {
      lastUpdatedAt,
    }
  }
});
</script>


<style lang='scss'>
.ReportIndex {
  text-shadow: 1px 1px white;

  .Paywall.Component {
    margin-top: -500px;
    background: linear-gradient(to bottom, rgba(239, 242, 248, 0) 0px, rgba(239, 242, 248, 1) 50%);
  }

  .BOX {
    @apply bg-[#E9EDF6] border border-slate-300 p-5;
    box-shadow: inset 1px 1px 0 white;
    .Numbers {
      @apply text-8xl text-slate-600 opacity-70;
      letter-spacing: -5px;
      span {
        @apply font-extralight;
      }
    }
    label {
      @apply text-slate-500 text-sm;
    }
  }
}
</style>