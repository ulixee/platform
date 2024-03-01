<template>
  <div
    :class="{
      isSelected: isSelected,
      notSelected: !isSelected,
      isFocused: isFocused,
      notFocused: !isFocused,
    }"
    class="OutputButton relative flex flex-row items-center whitespace-nowrap"
    @click="handleClick"
  >
    <div class="backgrounds">
      <div class="left-notch" />
      <div class="right-arrow" />
    </div>
    <Borders :is-selected="isSelected" :is-focused="isFocused" />

    <DatabaseIcon class="icon" />
    <span v-if="!isMinimal" class="label">{{ outputSize }} Output</span>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import DatabaseIcon from "@/assets/icons/database.svg";
import Borders from './Borders.vue';

export default Vue.defineComponent({
  name: 'OutputButton',
  components: {
    Borders,
    DatabaseIcon
  },
  props: ['isSelected', 'isFocused', 'isMinimal', 'outputSize'],
  emits: ['select'],
  setup() {
    return {};
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
@import '../variables';

.OutputButton {
  margin-top: 4px;
  margin-right: 12px;
  height: 28px;
  position: relative;
  color: $textColor;
  font-size: $fontSize;
  text-shadow: 1px 1px 0 white;
  padding-left: 15px;

  &.isSelected {
    color: $textColorSelected;
    .backgrounds {
      background: $bgColorSelected;
    }

    .icon {
      opacity: $iconOpacitySelected;
      filter: $iconFilterSelected;
    }
  }

  &.notSelected {
    .backgrounds {
      .left-notch {
        display: block;
      }
      .right-arrow {
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

  .right-arrow {
    position: absolute;
    display: none;
    top: 0.2;
    right: -13px;
    width: 0;
    height: 0;
    border-top: 14px solid transparent;
    border-bottom: 14px solid transparent;
    border-left: 13px solid $bgColor;
  }
}

.icon {
  height: 15px;
  opacity: $iconOpacity;
  object-fit: contain;
}
.label {
  padding-left: 3px;
  padding-right: 16px;
  display: block;
  position: relative;
}
</style>
