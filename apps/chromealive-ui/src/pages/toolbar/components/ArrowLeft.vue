<template>
  <div class="ArrowLeft" :class="{ selected: isSelected, active: isActive }"></div>
</template>

<script lang="ts">
  import * as Vue from 'vue';

  export default Vue.defineComponent({
    name: 'ArrowLeft',
    props: ['isSelected', 'isActive'],
  });
</script>

<style lang="scss" scoped="scoped">
  @use "sass:math";
  @import "../variables";

  .ArrowLeft {
    width: #{$arrowSize}px;
    height: #{$arrowSize}px;
    overflow: hidden;
    position: absolute;
    top: -2px;
    z-index: 3;

    &.selected::after {
      box-shadow: 1px 1px 2px $shadowColor;
      border-color: $borderColorSelected;
      background: white;
    }

    &.selected.active::after {
      border-width: 2px;
    }

    &::after {
      content: '';
      display: block;
      width: math.div($arrowSize, 1.31) * 1px;
      height: math.div($arrowSize, 1.31) * 1px;
      position: absolute;
      top: -1px;
      left: 0px;
      border: 1px solid $borderColor;
      transform: rotate(45deg);
      transform-origin: 0 0;
    }
  }
</style>
