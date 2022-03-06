<template>
  <div class="py-12 px-28">
    <div class="pb-5 mb-5 border-b border-gray-400 text-center ">
      <div class="text-2xl mb-2 script-path font-thin opacity-50">sites/kayak.ts</div>
      <h1>INPUT CONFIGURATION</h1>
    </div>
    <ul class="flex flex-row border-b border-gray-200 pb-5">
      <li class="flex-1">Started January 23, 2022 at 11:35:39 AM EST</li>
      <li class="flex-1">Finished on January 23, 2022 at 11:36:02 AM EST</li>
    </ul>

    <h2>Databox Input:</h2>
    <div class="box bg-gray-50 border border-gray-200">
      <pre class="p-5 text-sm text-gray-600">
{
  depAirportCode: ATL
  arrAirportCode: BOS
}
      </pre>
    </div>

    <h2>Hero Settings:</h2>
    <ul class="hero-settings">
      <li>
        <div class="label">User Agent String</div>
        <div class="value"></div>
      </li>
      <li>
        <div class="label">User Agent OS</div>
        <div class="value"></div>
      </li>
      <li>
        <div class="label">User Agent Browser</div>
        <div class="value"></div>
      </li>
      <li>
        <div class="label">Rendering Engine</div>
        <div class="value"></div>
      </li>
      <li>
        <div class="label">Internal IP Address</div>
        <div class="value"></div>
      </li>
      <li>
        <div class="label">Proxy IP Address</div>
        <div class="value"></div>
      </li>
      <li>
        <div class="label">Fingerprint</div>
        <div class="value"></div>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';

export default Vue.defineComponent({
  name: 'Input',
  setup() {
    return {
    };
  },
  methods: {},
  mounted() {}
});
</script>

<style lang="scss" scoped="scoped">
  h1 {
    color: #ADA0B6;
    @apply text-6xl mb-3;
  }

  h2 {
    @apply mt-10 font-bold mb-5;
  }

  ul.hero-settings {
    @apply grid grid-cols-2 gap-x-4;
    li:nth-child(1), li:nth-child(2) {
      @apply border-t;
    }
    li {
      @apply border-b py-5 font-thin;
      .label {
        @apply text-gray-400;
      }
    }
  }
</style>
