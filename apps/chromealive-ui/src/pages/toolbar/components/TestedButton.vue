<template>
  <button
    @click="handleClick"
    :class="{ selected: isSelected, unselected: !isSelected, active: isActive, inactive: !isActive }"
    class="TestedButton flex flex-row items-center"
  >
    <ArrowLeft
      :isSelected="isSelected"
      :isActive="isActive"
    />
    <img src="@/assets/icons/heart.svg" class="icon mr-1" />
    <span v-if="!isMinimal">36% TESTED</span>
  </button>
</template>

<script lang="ts">
  import * as Vue from 'vue';
  import ArrowLeft from './ArrowLeft.vue';

  export default Vue.defineComponent({
    name: 'InputButton',
    components: {
      ArrowLeft,
    },
    props: ['isSelected', 'isActive', 'isMinimal'],
    emits: ['select'],
    setup() {
      return {}
    },
    methods: {
      handleClick() {
        if (!this.isSelected) {
          this.$emit('select');
        }
      }
    }
  });
</script>

<style lang="scss" scoped="scoped">
  @use "sass:color";
  @import "../variables";

  .TestedButton {
    margin-top: 4px;
    margin-right: 4px;
    height: 28px;
    border: 1px solid transparent;
    border-left: none;
    position: relative;
    border-radius: 0 $borderRadius $borderRadius 0;
    padding: 0 10px 0 17px;
    color: $textColor;
    font-size: $fontSize;
    text-shadow: 1px 1px 0 white;
    margin-left: 7px;
    background: $bgColor;

    & > span {
      padding-right: 5px;
    }

    &.active {
      border-width: 2px;
      margin-right: 3px;
      .ArrowLeft {
        top: -2px;
      }
      .ArrowRight {
        top: -1px;
      }
    }

    &.selected {
      box-shadow: inset 1px 1px 2px $shadowColor;
      background: $bgSelected;
      border-color: $borderColorSelected;
      padding-left: 23px;
      margin-left: 3px;
      color: $textColorSelected;
      .ArrowLeft {
        left: 0;
      }
      .icon {
        filter: $iconFilterSelected;
        opacity: $iconOpacitySelected;
      }
    }

    &.unselected {
      &:before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        border-top: 13px solid transparent;
        border-bottom: 13px solid transparent;
        border-left: 13px solid white;
      }
    }

    &.unselected:hover {
      color: $textColorHover;
      background: $bgHover;
      border-color: color.scale($bgHover, $lightness: -5%);
      box-shadow: inset 1px 1px 0 white;
      .icon {
        opacity: $iconOpacityHover;
      }
    }
  }
  .icon {
    height: 15px;
    position: relative;
    top: 0.5px;
    opacity: $iconOpacity;
  }
  .ArrowLeft {
    left: -6px;
    top: -1px;
  }
  .ArrowRight {
    top: -2px;
  }
  button {
    cursor: default;
  }
</style>
