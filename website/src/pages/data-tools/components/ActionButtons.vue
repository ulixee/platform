<template>
  <div class="flex flex-row mt-10 mb-6 space-x-5 items-center">
    <a :href="`https://docs.ulixee.org/${productKey}`" class="bg-[#AC12BF] text-white px-5 py-2 rounded no-underline">Open Documentation</a> 
    <span class="opacity-30 pl-1">or</span>
    <router-link :to="`/${productKey}/example`">View Example Code</router-link>
  </div>
</template>

<script lang="ts">
import * as Vue from "vue";

export default Vue.defineComponent({
  props: {
    productKey: {
      type: String,
      required: true,
    },
  },
  components: {  }
});
</script>