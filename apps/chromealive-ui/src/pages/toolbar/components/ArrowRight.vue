<template>
  <div class="ArrowRight" :class="{ isSelected: isSelected, isFocused: isFocused }">
    <div class="smoother"></div>
  </div>
</template>

<script lang="ts">
  import * as Vue from 'vue';

  export default Vue.defineComponent({
    name: 'ArrowRight',
    props: ['isSelected', 'isFocused'],
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
    top: 0;
    z-index: 2;

    &::after {
      content: '';
      display: block;
      width: math.div($arrowSize, 1.30) * 1px;
      height: math.div($arrowSize, 1.30) * 1px;
      position: absolute;
      top: -1px;
      left: 0;
      border: 1px solid $borderColor;
      transform: rotate(45deg);
      transform-origin: 0 0;
    }

    .smoother {
      display: none;
      position: absolute;
      left: 0;
      top: 5px;
      height: calc(100% - 8px);
      width: 1px;
      background: $bgColorSelected;
      z-index: 2;
    }

    &.isSelected {
      &::after {
        background: $bgColorSelected;
        box-shadow: inset 1px 1px 2px $shadowColor;
        border: 1px solid $borderColorSelected;
      }
      .smoother {
        display: block;
      }
    }
    &.isFocused {
      &::after {
        border-width: 2px;
      }
    }
  }
</style>
