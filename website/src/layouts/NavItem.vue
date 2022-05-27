<template>
  <li class="NavItem" :class="[isComingSoon ? 'COMING-SOON' : '']">
    <slot />
  </li>
</template>

<script lang="ts">
import * as Vue from "vue";

export default Vue.defineComponent({
  props: ['isComingSoon']
});
</script>

<style lang="scss">
  .NavItem {
    @apply mt-3;
    a {
      @apply no-underline;
    }
    a, &.COMING-SOON > div {
      @apply block flex flex-row;
    }
    &.COMING-SOON {
      @apply opacity-50;
      header:after {
        content: 'Coming Soon';
        @apply font-light uppercase text-xs bg-[#f4eff4] border border-[#b6b4b6] rounded-lg px-2 ml-2;
      }
    }
    svg {
      @apply mr-3 w-8;
      height: auto;
    }
    header {
      @apply font-bold text-gray-900;
    }
    p {
      @apply font-light text-gray-600
    }
  }
</style>