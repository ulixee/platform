<template>
  <div>
    <div class='EconomyIndex Page min-h-screen mt-52'>
      <h1 class="text-center font-bold text-lg text-ulixee-darker md:text-2xl xl:text-2xl opacity-50 tracking-[0.2em]">ECONOMY</h1>
      <h2 class='text-center text-[5rem] font-black leading-[1.1em] mt-2 text-ulixee-darker px-[15%]'>
        A BRIEF GUIDE TO<br />
        THE ULIXEE ECOSYSTEM
      </h2>
      <p class='font-extralight px-[22%] text-xl mt-3 leading-normal'>Ulixee’s economic system is a fully-functioning, self-sustaining microcosm with its own GDP, currency, governance, taxation, and more. It’s also fully decentralized, meaning everyone in the community has an equal right to own, run, and profit from the network.</p>

<!--      <ul class="PAGES mx-[20%] mt-24 grid grid-cols-3 space-x-10 gap-y-4 pr-10 text-center">-->
<!--        <li class="ml-10">-->
<!--          <inline-svg :src="require('@/assets/menu-icons/getting-started.svg')" />-->
<!--          Getting Started-->
<!--        </li>-->
<!--        <li>-->
<!--          <inline-svg :src="require('@/assets/menu-icons/developer-grants.svg')" />-->
<!--          Developer Grants-->
<!--        </li>-->
<!--        <li>-->
<!--          <inline-svg :src="require('@/assets/menu-icons/network-pulse.svg')" />-->
<!--          Network Pulse-->
<!--        </li>-->
<!--        <li>-->
<!--          <inline-svg :src="require('@/assets/menu-icons/platform-pricing.svg')" />-->
<!--          Platform Pricing-->
<!--        </li>-->
<!--        <li>-->
<!--          <inline-svg :src="require('@/assets/menu-icons/bitcoin-stabilization.svg')" />-->
<!--          Bitcoin Stabilization-->
<!--        </li>-->
<!--        <li>-->
<!--          <inline-svg :src="require('@/assets/menu-icons/community-conversations.svg')" />-->
<!--          Community Conversations-->
<!--        </li>-->
<!--        <li>-->
<!--          <inline-svg :src="require('@/assets/menu-icons/global-ownership.svg')" />-->
<!--          Global Ownership-->
<!--        </li>-->
<!--        <li>-->
<!--          <inline-svg :src="require('@/assets/menu-icons/decentralized-governance.svg')" />-->
<!--          Decentralized Governance-->
<!--        </li>-->
<!--        <li>-->
<!--          <inline-svg :src="require('@/assets/menu-icons/nonprofit-foundation.svg')" />-->
<!--          Nonprofit Foundation-->
<!--        </li>-->
<!--      </ul>-->

      <Paywall class='relative z-20' />
      <LegoBlocks />

    </div>
  </div>
</template>
<script lang="ts">
import * as Vue from "vue";
import Paywall from '@/components/Paywall.vue';
import LegoBlocks from '@/components/LegoBlocks.vue';

export default Vue.defineComponent({
  components: {
    Paywall,
    LegoBlocks,
  },
});
</script>

<style lang='scss'>
.EconomyIndex {
  ul.PAGES {
    li {
      @apply border-b border-gray-300 py-6 text-left;
      &:nth-child(-n+3) {
        @apply border-t;
      }
    }
    svg {
      @apply w-7 h-7 inline-block mr-2;
    }
  }
}
</style>
<script setup lang='ts'>
</script>