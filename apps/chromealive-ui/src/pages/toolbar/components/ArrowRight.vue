<template>
  <div class="ArrowRight" :class="{ selected: isSelected, active: isActive }"></div>
</template>

<script lang="ts">
  import * as Vue from 'vue';

  export default Vue.defineComponent({
    name: 'ArrowRight',
    props: ['isSelected', 'isActive'],
  });
</script>

<style lang="scss" scoped="scoped">
  @use "sass:math";
  @import "../variables";

  .ArrowRight {
    width: math.div($arrowSize, 1.90) * 1px;
    height: #{$arrowSize}px;
    overflow: hidden;
    position: absolute;
    top: -1px;
    z-index: 2;

    &::after {
      content: '';
      display: block;
      width: math.div($arrowSize, 1.33) * 1px;
      height: math.div($arrowSize, 1.33) * 1px;
      position: absolute;
      top: -1px;
      left: 0;
      border: 1px solid $borderColor;
      transform: rotate(45deg);
      transform-origin: 0 0;
      background: $bgColor;
    }

    &.selected {
      &::after {
        background: $bgSelected;
        box-shadow: inset 1px 1px 2px $shadowColor;
        border: 1px solid $borderColorSelected;
      }
    }
    &.active {
      &::after {
        border-width: 2px;
      }
    }
  }
</style>
