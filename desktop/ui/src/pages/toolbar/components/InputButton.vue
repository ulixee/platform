<template>
  <div
    :class="{ isSelected: isSelected, notSelected: !isSelected }"
    class="InputButton relative flex flex-row items-center whitespace-nowrap"
    @click="handleClick"
    @mouseover="hoverItem = 'all'"
    @mouseleave="hoverItem = ''"
  >
    <div class="backgrounds">
      <div class="right-arrow" />
    </div>

    <Borders :is-selected="isSelected" :is-focused="isSelected" :has-left-circle="true" />

    <InputIcon class="icon" />
    <span v-if="!isMinimal" class="label">{{ inputSize }} Input</span>
  </div>
</template>

<script lang="ts">
import InputIcon from '@/assets/icons/input.svg';
import * as Vue from 'vue';
import ArrowRight from './ArrowRight.vue';
import Borders from './Borders.vue';

export default Vue.defineComponent({
  name: 'InputButton',
  components: {
    ArrowRight,
    Borders,
    InputIcon
  },
  props: ['isSelected', 'isMinimal', 'inputSize'],
  emits: ['select'],
  setup() {
    return {
      hoverItem: Vue.ref(''),
    };
  },
  methods: {
    handleClick() {
      if (!this.isSelected) {
        this.$emit('select');
      }
    },
  },
});
</script>

<style lang="scss" scoped="scoped">
@use 'sass:color';
@import '../variables.scss';

.InputButton {
  margin-top: 4px;
  height: 28px;
  position: relative;
  color: $textColor;
  text-shadow: 1px 1px 0 white;
  margin-right: 12px;
  padding-left: 10px;
  padding-right: 0px;
  font-size: $fontSize;
  border-radius: $borderRadius 0 0 $borderRadius;

  &.notSelected:hover {
    color: $textColorHover;
    .backgrounds {
      background: $bgColorHover;
      .right-arrow {
        border-left-color: $bgColorHover;
      }
    }
  }

  &.isSelected {
    color: $textColorSelected;

    .backgrounds {
      width: calc(100% + 3px);
      background: $bgColorSelected;
    }
    .icon {
      filter: $iconFilterSelected;
      opacity: $iconOpacitySelected;
    }
  }
}

.icon {
  opacity: $iconOpacity;
  height: 15px;
}

.label {
  position: relative;
  padding-left: 5px;
  padding-right: 10px;
}

.backgrounds {
  background: $bgColor;
  position: absolute;
  top: 0;
  left: 0;
  width: calc(100%);
  height: 100%;
  border-radius: $borderRadius 0 0 $borderRadius;

  .right-arrow {
    position: absolute;
    top: 0.2px;
    right: -14px;
    width: 0;
    height: 0;
    border-top: 14px solid transparent;
    border-bottom: 14px solid transparent;
    border-left: 14.5px solid $bgColor;
  }
}
</style>
