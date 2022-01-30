<template>
  <div
    :class="{ active: isActive, inactive: !isActive, hover: hoverItem === 'all' }"
    @mouseover="hoverItem = 'all'"
    @mouseleave="hoverItem = ''"
    class="AddressField relative flex flex-row items-center whitespace-nowrap"
  >
    <div
      class="icon"
      :class="{ hover: hoverItem === 'icon', hasMenu: isShowingMenu }"
      @mouseover="handleIconMouseover"
      @mouseout="hoverItem = ''"
      @click="menuToggle"
    >
      <img src="@/assets/icons/logo.svg" />
    </div>
    <input
      ref="inputElem"
      @focus="handleInputFocus"
      @blur="handleInputBlur"
      type="text"
      class="p-0 m-0 w-full bg-transparent border-transparent focus:border-transparent focus:ring-0"
      tabindex="-1"
      value="example.org"
    />
  </div>
</template>

<script lang="ts">
  import * as Vue from 'vue';
  import { PropType } from 'vue';
  import WindowsController, { EmitterName } from '@/pages/toolbar/lib/WindowsController';

  export default Vue.defineComponent({
    name: 'AddressField',
    props: {
      isActive: {
        type: Boolean as PropType<Boolean>,
        required: true,
      }
    },
    emits: ['toggle'],
    setup() {
      return {
        inputElem: Vue.ref<HTMLInputElement>(),
        isShowingMenu: Vue.ref<boolean>(false),
        hoverItem: Vue.ref(''),
      }
    },
    methods: {
      handleInputFocus() {
        if (!this.isActive) {
          this.$emit('toggle');
          this.inputElem.select();
        }
      },

      handleInputBlur() {
        if (this.isActive) {
          this.$emit('toggle');
          this.inputElem.blur();
        }
        this.inputElem.selectionEnd = this.inputElem.selectionStart;
      },

      handleIconMouseover(event: MouseEvent) {
        this.hoverItem = 'icon';
        event.stopPropagation();
        event.stopImmediatePropagation();
      },

      menuToggle(event: MouseEvent) {
        event.stopPropagation();
        if (this.isShowingMenu) {
          this.hideMenu();
        } else {
          this.showMenu(event);
        }
      },

      showMenu(event: MouseEvent) {
        if (this.isShowingMenu) return;
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        WindowsController.showMenuPrimary(rect);
        this.isShowingMenu = true;
      },

      hideMenu() {
        WindowsController.hideMenuPrimary();
      },

      finishHideMenu() {
        this.isShowingMenu = false;
      }
    },

    mounted() {
      // window.addEventListener('blur', this.hideMenu);
      window.addEventListener('click', this.hideMenu);
      WindowsController.on(EmitterName.hideMenu, this.finishHideMenu);
    },

    beforeUnmount() {
      // window.removeEventListener('blur', this.hideMenu);
      window.removeEventListener('click', this.hideMenu);
      WindowsController.off(EmitterName.hideMenu, this.finishHideMenu);
    },
  });
</script>

<style lang="scss" scoped="scoped">
  @use "sass:color";
  @use "sass:math";
  @import "../variables";

  .AddressField {
    margin-top: 4px;
    height: 28px;
    background: #F1F3F4;
    position: relative;
    color: #444444;
    text-shadow: 1px 1px 0 white;
    margin-right: 2px;
    padding-right: 0px;
    border-radius: $borderRadius;
    font-size: 13px;
    transition: width 0.5s;

    & > span {
      padding-right: 15px;
    }

    &.inactive.hover {
      background: #E9EBEC;
    }

    &.active {
      background: $bgSelected;
      padding-right: 3px;

      &:before {
        content: '';
        border: 2px solid #1866D2;
        box-shadow: inset 1px 1px 2px $shadowColor;
        border-radius: $borderRadius;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2;
        pointer-events: none;
      }

      .icon.hover {
        border: 1.5px solid white;
        border-color-right: transparent;
        background: #E9EBEC;
      }
    }
  }

  .icon {
    min-width: 30px;
    text-align: center;
    cursor: default;
    height: 26px;
    border-radius: 13px;
    box-sizing: border-box;
    border: 1.5px solid transparent;
    display: block;
    position: relative;
    margin-left: 1.5px;
    z-index: 1;
    &.hover {
      background: #DCDEE0;
      img {
        filter: $iconFilterSelected;
        opacity: $iconOpacitySelected;
      }
    }
    &.hasMenu {
      background: color.scale(#DCDEE0, $lightness: -5%);;
      img {
        filter: $iconFilterSelected;
        opacity: $iconOpacitySelected;
      }
    }
    img {
      height: 15px;
      display: inline-block;
      position: relative;
      top: calc(50% - 7.5px);
      opacity: 0.7;
      pointer-events: none;
    }
  }

  .menu-wrapper {
    position: absolute;
    top: calc(100% + 3px);
    left: -5px;
    min-width: 300px;
    z-index: 100;
  }

  input {
    cursor: text;
    font-size: 14px;
  }

  $arrowUpSize: 20;
  .arrow-up {
    width: #{$arrowUpSize}px;
    height: #{$arrowUpSize}px;
    overflow: hidden;
    position: absolute;
    top: -19px;
    left: 10px;
    pointer-events: none;

    &::before {
      content: '';
      display: block;
      width:  math.div($arrowUpSize, 1.41) * 1px;
      height: math.div($arrowUpSize, 1.41) * 1px;
      position: absolute;
      bottom: 0;
      left: -0.5px;
      @apply bg-gray-100;
      border: 1px solid rgba(0,0,0,0.25);
      box-shadow: 1px 1px 5px 1px rgba(0,0,0,0.3);
      transform: rotate(45deg);
      transform-origin: 0 100%;
    }
  }
</style>
