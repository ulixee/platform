<template>
  <div>
    <div class='min-h-screen pt-60'>

      <h1 class="text-center font-bold text-lg text-ulixee-darker md:text-2xl xl:text-2xl opacity-50 tracking-[0.2em]">ULIXEE'S ARGON</h1>
      <h2 class='text-center text-[5rem] font-black leading-[1.1em] mt-2 text-ulixee-darker px-[15%]'>
        A FULLY STABLE<br />
        DIGITAL CURRENCY THAT<br />
        IS RESISTANT TO INFLATION
      </h2>

      <div class='px-[23%]'>
        <p class='font-extralight mt-8 text-center text-xl opacity-75 px-[5%] leading-relaxed'>
          Argon is pegged to the consumer price index. This ensures a single argon will hold stable purchasing power over an indefinite timeframe. More importantly, argon is the first currency immune from death spirals.</p>
<!--        <ArgonIllustration class='mt-10' />-->
      </div>

      <Paywall class='relative z-20' />
      <LegoBlocks />
    </div>

<!--    <div class='flex flex-row'>-->
<!--      <div class='w-6/12'>-->
<!--        <h2>Earn Argons</h2>-->
<!--        <p>The easiest way to earn argons is by participating in the Data Economy: build and market Datastores, run Cloud Nodes, participate in Mining… Learn more.</p>-->
<!--      </div>-->
<!--      <div class='w-6/12'>-->
<!--        <h2>Trade Argons</h2>-->
<!--        <p>There are multiple avenues for buying and selling your argons. The easiest is through decentralized token exchanges such as Uniswap… Learn more.</p>-->
<!--      </div>-->
<!--    </div>-->

  </div>
</template>

<script lang="ts">
import * as Vue from "vue";
import LegoBlocks from '@/components/LegoBlocks.vue';
import Paywall from '@/components/Paywall.vue';
import ArgonIllustration from '@/pages/argon/components/ArgonIllustration.vue';

export default Vue.defineComponent({
  components: {
    LegoBlocks,
    ArgonIllustration,
    Paywall,
  },
});
</script>
