<template>
  <li class="NavItem" >
    <slot />
  </li>
</template>

<script lang="ts">
import * as Vue from "vue";

export default Vue.defineComponent({
  props: ['isComingSoon']
});
</script>

