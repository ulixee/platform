<template>
  <router-link :to="`/featured/${logo.name}`" class="LegoBlock Component" :class='{ purple, alignRight }'>
    <inline-svg :src="logo.src" />
  </router-link>
</template>

<script lang="ts">
import * as Vue from "vue";

export default Vue.defineComponent({
  props: {
    logo: Object,
    purple: Boolean,
    alignRight: Boolean,
  },
});
</script>

<style lang='scss'>
.LegoBlock.Component {
  height: 100%;
  max-height: 65px;
  background: rgb(255, 255, 255, 0.3);
  border: 1px solid rgba(181, 186, 198, 0.4);
  box-shadow: inset 1px 1px 0 rgba(255,255,255,1);
  text-align: center;
  @apply flex items-center px-5 min-w-[100px] md:min-w-[200px];
  margin-right: 8px;

  &.alignRight {
    margin-right: 0;
    margin-left: 8px;
  }

  &:hover {
    svg {
      opacity: 1;
    }
  }
  &.purple {
    background: #AB5BB5;
    border: 1px solid #8A3B94;
    box-shadow: 1px 1px 3px rgba(0,0,0,0.3), inset 1px 1px 0 rgba(255,255,255,0.2);
    &:hover {
      background: #bf6cca;
      svg {
        opacity: 0.7;
      }
    }
    svg {
      path {
        fill: white;
      }
    }
  }
  svg {
    display: inline-block;
    pointer-events: none;
    height: 40%;
    margin: auto;
    opacity: 0.2;
    path {
      fill: #B3BCD3;
    }
  }
}
</style>