<template>
  <div
    @click="menuToggle"
    class="MenuButton relative flex flex-row items-center whitespace-nowrap"
    :class="{ hasMenu: isShowingMenu }"
  >
    <div class="menu-icon">
      <img src="@/assets/icons/logo.svg" />
    </div>
  </div>
</template>

<script lang="ts">
  import * as Vue from 'vue';
  import WindowsController, { EmitterName } from '@/pages/toolbar/lib/WindowsController';

  export default Vue.defineComponent({
    name: 'MenuButton',
    components: {},
    setup() {
      return {
        isShowingMenu: Vue.ref<boolean>(false),
      }
    },
    methods: {
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
      WindowsController.on(EmitterName.hideMenuPrimary, this.finishHideMenu);
    },

    beforeUnmount() {
      // window.removeEventListener('blur', this.hideMenu);
      window.removeEventListener('click', this.hideMenu);
      WindowsController.off(EmitterName.hideMenuPrimary, this.finishHideMenu);
    },
  });
</script>

<style lang="scss" scoped="scoped">
  @use "sass:color";
  @import "../variables.scss";

  .MenuButton {
    margin: 4px 6px 0 2px;
    height: 28px;
    position: relative;
    color: $textColor;
    text-align: center;
    text-shadow: 1px 1px 0 white;
    font-size: $fontSize;    
    border-radius: $borderRadius;

    &:hover {
      background: rgba($bgColorHover, 0.75);
    }
    &.hasMenu {
      background: color.scale(#DCDEE0, $lightness: -5%);;
      .menu-icon img {
        filter: $iconFilterSelected;
        opacity: $iconOpacitySelected;
      }
    }
  }

  .menu-icon {
    min-width: 28px;
    text-align: left;
    cursor: default;
    height: 26px;
    border-radius: 13px;
    box-sizing: border-box;
    border: 1px solid transparent;
    display: block;
    position: relative;
    z-index: 1;

    img {
      height: 15px;
      display: inline-block;
      position: relative;
      top: calc(50% - 7.5px);
      opacity: 0.7;
      pointer-events: none;
      left: 5px;
    }
  }
</style>
