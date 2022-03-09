<template>
  <div
    @click="handleClick"
    :class="{ isSelected: isSelected, notSelected: !isSelected, isFocused: isFocused, notFocused: !isFocused }"
    class="ReliabilityButton flex flex-row items-center"
  >
    <div class="backgrounds">
      <div class="left-notch"></div>
    </div>
    <Borders :isSelected="isSelected" :isFocused="isFocused" :showArrow="false" />

    <img src="@/assets/icons/heart.svg" class="icon" />
    <span class="label" v-if="!isMinimal">36% Reliability</span>
  </div>
</template>

<script lang="ts">
  import * as Vue from 'vue';
  import Borders from './Borders.vue';

  export default Vue.defineComponent({
    name: 'ReliabilityButton',
    components: {
      Borders,
    },
    props: {
      isSelected: {
        type: Boolean,
      },
      isFocused: {
        type: Boolean,
      }, 
      isMinimal: {
        type: Boolean,
      },
    },
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

  .ReliabilityButton {
    margin-top: 4px;
    height: 28px;
    position: relative;
    border-radius: 0 $borderRadius $borderRadius 0;
    padding: 0 10px 0 17px;
    color: $textColor;
    font-size: $fontSize;
    text-shadow: 1px 1px 0 white;

    &.isSelected {
      color: $textColorSelected;
      .backgrounds {
        background: $bgColorSelected;
      }
      .icon {
        filter: $iconFilterSelected;
        opacity: $iconOpacitySelected;
      }
    }

    &.notSelected {
      .backgrounds {
        .left-notch {
          display: block;
        }
      }
    }

    &.notSelected:hover {
      color: $textColorHover;
      .backgrounds {
        background: $bgColorHover;
        .right-arrow {
          border-left-color: $bgColorHover;
        }
      }
      .icon {
        opacity: $iconOpacityHover;
      }
    }
  }

  .backgrounds {
    position: absolute;
    left: -4px;
    top: 0;
    width: calc(100% + 4px);
    height: 100%;
    background: $bgColor;
    border-radius: 0 $borderRadius $borderRadius 0;

    .left-notch {
      position: absolute;
      display: none;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      border-top: 14px solid transparent;
      border-bottom: 14px solid transparent;
      border-left: 13px solid white;
    }
  }
  .icon {
    height: 15px;
    opacity: $iconOpacity;
  }
  .label {
    padding-left: 3px;
    padding-right: 16px;
    display: block;
    position: relative;
  }
</style>
