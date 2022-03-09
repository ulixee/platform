<template>
  <div class="Borders" :class="{ isSelected: isSelected, notSelected: !isSelected, hasHalfCircle: !showArrow }">
    <div class="line top"></div>
    <div class="line bottom"></div>
    <ArrowRight
      :isSelected="isSelected"
      :isFocused="isSelected"
      v-if="showArrow"
    />
    <div v-else class="half-circle"></div>
  </div>
</template>

<script lang="ts">
  import * as Vue from 'vue';
  import ArrowRight from './ArrowRight.vue';

  export default Vue.defineComponent({
    name: 'Borders',
    components: {
      ArrowRight,
    },
    props: {
      isSelected: {
        type: Boolean,
      },
      showArrow: {
        type: Boolean,
        default: true,
      },
    }
  });
</script>

<style lang="scss" scoped="scoped">
  @use "sass:color";
  @import "../variables.scss";

  .Borders {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    
    &.isSelected {
      .line {
        display: block;
      }
      .half-circle {
        display: block;
      }
    }

    &.hasHalfCircle {
      .line {
        width: calc(100% - 17px);
        right: 16px;
      }
    }
  }

  .ArrowRight {
    right: -16.8px;
  }

  .half-circle {
    position: absolute;
    display: none;
    top: 0;
    right: 0;
    border: 1.5px solid $borderColorSelected;
    border-left: 0;
    height: 100%;
    width: 16px;
    border-radius: 0 $borderRadius $borderRadius 0;
    box-shadow: inset 0 1px 2px $shadowColor;
    &:after {
      content: '';
      position: absolute;
      top: 3px;
      left: 0;
      width: 2px;
      height: calc(100% - 3px);
      background-color: white;
    }
  }

  .line {
    position: absolute;
    display: none;
    right: -2px;
    width: calc(100% + 1px);
    height: 1.5px;
    background: linear-gradient(to right, $bgColorSelected 0%, $borderColorSelected 35px);
    &.top {
      top: 0;
      box-shadow: 0 1px 2px $shadowColorEnhanced;
      &:after {
        content: '';
        position: absolute;
        width: 35px;
        height: 3px;
        left: -1px;
        top: 1.5px;
        background: linear-gradient(to right, $bgColorSelected 0%, rgba($bgColorSelected, 0) 100%);
      }
    }
    &.bottom {
      bottom: 0;
    }
  }
</style>
