<template>
  <button
    @click="handleClick"
    :class="{ selected: isSelected, unselected: !isSelected, active: isActive,  }"
    class="InputButton relative flex flex-row items-center whitespace-nowrap"
  >
    <div class="active-border"></div>
    <img src="@/assets/icons/input.svg" class="icon ml-3 mr-2" />
    <span v-if="!isMinimal">2KB INPUT</span>
    <ArrowRight
      v-if="isSelected"
      :isSelected="isSelected"
      :isActive="isActive"
    />
  </button>
</template>

<script lang="ts">
  import * as Vue from 'vue';
  import ArrowRight from './ArrowRight.vue';

  export default Vue.defineComponent({
    name: 'InputButton',
    components: {
      ArrowRight,
    },
    props: ['isSelected', 'isMinimal', 'isActive'],
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

  .InputButton {
    margin-top: 4px;
    height: 28px;
    border: 1px solid transparent;
    border-right: none;
    position: relative;
    color: $textColor;
    text-shadow: 1px 1px 0 white;
    margin-right: 2px;
    padding-right: 0px;
    border-radius: $borderRadius 0 0 $borderRadius;
    font-size: $fontSize;
    background: $bgColor;

    & > span {
      padding-right: 15px;
    }

    &.unselected {
      &:after {
        content: '';
        position: absolute;
        top: -0.85px;
        right: -14px;
        width: 0;
        height: 0;
        border-top: 14px solid transparent;
        border-bottom: 14px solid transparent;
        border-left: 14.5px solid $bgColor;
      }
    }

    &.unselected:hover {
      color: $textColorHover;
      background: $bgHover;
      &:after {
        border-left-color: $bgHover;
      }
      .icon {
        opacity: $iconOpacityHover;
      }
    }

    &.selected {
      box-shadow: inset 1px 1px 2px $shadowColor;
      border-color: $borderColorSelected;
      background: $bgSelected;
      padding-right: 3px;
      margin-right: -2px;
      color: $textColorSelected;

      &:before {
        content: '';
        position: absolute;
        right: 0;
        top: 5px;
        height: calc(100% - 8px);
        width: 2px;
        background: $bgSelected;
      }

      &.active .active-border {
        border-color: $borderColorSelected;
        box-shadow: inset 1px 1px 2px $shadowColor;
        border-radius: 17px 0 0 17px;
      }

      .icon {
        filter: $iconFilterSelected;
        opacity: $iconOpacitySelected;
      }
    }
  }

  .active-border {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    border: 1px solid transparent;
    border-right: none;
  }

  .icon {
    opacity: $iconOpacity;
    height: 15px;
  }

  .ArrowRight {
    right: -15px;
  }

  button {
    cursor: default;
  }
</style>
