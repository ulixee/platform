<template>
  <button
    @click="handleClick"
    :class="{ selected: isSelected, unselected: !isSelected, active: isActive, inactive: !isActive }"
    class="OutputButton relative flex flex-row items-center whitespace-nowrap"
  >
    <ArrowLeft
      :isSelected="isSelected"
      :isActive="isActive"
    />
    <img src="@/assets/icons/database.svg" class="icon mr-1" />
    <span v-if="!isMinimal">{{outputSize}}KB OUTPUT</span>
    <ArrowRight
      v-if="isSelected"
      :isSelected="isSelected"
      :isActive="isActive"
    />
  </button>
</template>

<script lang="ts">
  import * as Vue from 'vue';
  import ArrowLeft from './ArrowLeft.vue';
  import ArrowRight from './ArrowRight.vue';

  export default Vue.defineComponent({
    name: 'OutputButton',
    components: {
      ArrowLeft,
      ArrowRight,
    },
    props: ['isSelected', 'isActive', 'isMinimal', 'outputSize'],
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

  .OutputButton {
    margin-top: 4px;
    height: 28px;
    border: 1px solid transparent;
    border-left: none;
    border-right: none;
    position: relative;
    color: $textColor;
    font-size: $fontSize;
    margin-left: 5px;
    text-shadow: 1px 1px 0 white;
    padding-left: 16px;
    padding-right: 0px;
    background: $bgColor;

    & > span {
      padding-left: 2px;
      padding-right: 6px;
      display: block;
    }

    .icon {
      height: 15px;
      opacity: $iconOpacity;
    }

    &.active {
      border-width: 2px;
    }

    &.inactive {
      .ArrowLeft {
        top: -1px;
      }
    }

    &.selected {
      box-shadow: inset 1px 1px 2px $shadowColor;
      background: $bgSelected;
      border-color: $borderColorSelected;
      color: $textColorSelected;
      margin-left: 0;
      padding-left: 20px;
      margin-right: -2px;
      padding-right: 2px;

      .icon {
        opacity: $iconOpacitySelected;
        filter: $iconFilterSelected;
      }

      .ArrowLeft {
        left: 0px;
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

      &:after {
        content: "";
        position: absolute;
        top: -0.5;
        right: -13px;
        width: 0;
        height: 0;
        border-top: 13.5px solid transparent;
        border-bottom: 14.5px solid transparent;
        border-left: 13.5px solid $bgColor;
      }
    }

    &.unselected:hover {
      color: $textColorHover;
      background: $bgHover;
      border-color: color.scale($bgHover, $lightness: -5%);
      box-shadow: inset 1px 1px 0 white;
      &:after {
        border-left-color: $bgHover;
      }
      .icon {
        opacity: $iconOpacityHover;
      }
    }
  }
  button {
    cursor: default;
  }
  .ArrowRight {
    right: -14px;
    top: -2px;
  }
  .ArrowLeft {
    left: -5px;
    top: -2px;
  }
</style>
