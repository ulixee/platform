<template>
  <div>
    <div class='min-h-screen pt-52 px-[26%]'>
      <h1 class='text-center text-8xl font-black text-ulixee-darker'>NOTARIES</h1>
      <h2 class='text-center text-3xl font-black mt-1 text-ulixee-darker opacity-50'>
        Miners are the computational nodes that power Ulixee’s Mainchain.
      </h2>
      <div class='flex flex-col space-y-3 font-light mt-4 text-xl'>
        <p>
          Miners are responsible for discovery of datastores around the network, and they build the mainchain blocks. As a group, the miners must verify “burned” funds to attempt to close a block, and their resulting signature is used to generate a nonce that will attempt to close the current block.
        </p>
        <p>
          Miners must secure a “stake” to participate in closing blocks. This stake does not gain any value, but is rather a monetary limit intended to limit the ability to introduce too many miners into the kad.
        </p>
        <p>
          Miners will be a very popular activity to spin up. To that end, we have built-in a function to stake and publish up to 65k miners in a single MinerInfo packet.
        </p>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import * as Vue from "vue";

export default Vue.defineComponent({
  components: {},
  setup() {
    return {}
  },
});
</script>
