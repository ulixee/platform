<template>
  <div class='MainchainIndex Page relative'>
    <div class='min-h-screen pt-60 relative'>
      <h1 class="text-center font-bold text-lg text-ulixee-darker md:text-2xl xl:text-2xl opacity-50 tracking-[0.2em]">ULIXEE'S MAINCHAIN</h1>
      <h2 class='text-center text-[5rem] font-black leading-[1.1em] mt-2 text-ulixee-darker px-[15%]'>
        A PROOF-OF-WORK<br />BLOCKCHAIN THAT IS<br />POWERED BY DATA QUERIES
      </h2>

      <div class='px-[23%] relative z-10'>
        <p class='font-extralight mt-8 text-center text-xl opacity-75 px-[5%] leading-relaxed'>
          Mainchain’s proof-of-work algorithm uses the output of data queries to close blocks instead of random computational hashes. More importantly, its on-chain-off-block merkle architecture delivers massive scalability with minimal block size.
        </p>
<!--        <MainchainIllustration class='mt-20' />-->

<!--        <div class='flex flex-row space-x-5 mt-10'>-->
<!--          <router-link to='/mainchain/whitepaper' class='bg-ulixee-purple border border-ulixee-darker px-3 py-1 text-white rounded no-underline'>Read the Whitepaper</router-link>-->
<!--          <span>or</span>-->
<!--          <a>Why We Built It?</a>-->
<!--        </div>-->
      </div>

      <Paywall class='relative z-20' />
      <LegoBlocks />
    </div>

<!--    <div class='BOX'>-->
<!--      <h2>It’s Fast</h2>-->
<!--      <div>Mainchain’s Native Layer-Two Settlement Technology Is Lightning Quick</div>-->
<!--      <p>Argon transactions are measured in miliseconds not seconds or even minutes.</p>-->
<!--    </div>-->

<!--    <div class='BOX'>-->
<!--      <h2>It’s Scalable</h2>-->
<!--      <div>Mainchain Transactions Are Secured On-Chain-Off-Block Opening Up Immense Possibilities</div>-->
<!--      <p>Mainchain’s merkle tree design enables billions of account balances to be stored in less than 126 bytes of-->
<!--        block storage.</p>-->
<!--    </div>-->

<!--    <div class='BOX'>-->
<!--      <h2>It’s Efficient</h2>-->
<!--      <div>Mainchain’s Proof-of-Work Is Powered By Real Data Queries Instead of Random Hashes</div>-->
<!--      <p>Mainchain’s proof-of-work uses data queries flowing through the Ulixee Datanet to generate block nonces. This-->
<!--        creates an extremely efficient system where no bytes are thrown away and no wasted energy is burned.</p>-->
<!--    </div>-->

<!--    <div class='BOX'>-->
<!--      <h2>It’s Decentralized</h2>-->
<!--      <div>Power Players Can’t Use ASIC Miners or Massive Stake to Buy Their Way to the Top of Mainchain</div>-->
<!--      <p>Because every block requires processing a legit data query, there is no way to use ASIC miners or massive stake-->
<!--        to buy your way to the top of Mainchain. This means that Mainchain is truly decentralized and open to all.</p>-->
<!--    </div>-->

<!--    <div class='h-52 text-center'>-->
<!--      <h2>Block Dissection</h2>-->
<!--    </div>-->

  </div>
</template>

<script lang="ts">
import * as Vue from "vue";
import LegoBlocks from '@/components/LegoBlocks.vue';
import Paywall from '@/components/Paywall.vue';
import MainchainIllustration from '@/pages/mainchain/components/MainchainIllustration.vue';

export default Vue.defineComponent({
  components: {
    LegoBlocks,
    MainchainIllustration,
    Paywall,
  },
});
</script>

<style lang="scss">
.MainchainIndex {
  .BOX {
    text-align: center;
    padding: 25px;
    margin: 10px;
    background: #E9EDF6;
    border: 1px solid rgba(181, 186, 198, 0.5);
    box-shadow: inset 1px 1px 0 rgba(255,255,255,1);
  }
}
</style>