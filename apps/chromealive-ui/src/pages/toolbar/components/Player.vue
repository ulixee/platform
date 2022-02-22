<template>
  <div
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    :class="{ selected: isSelected, unselected: !isSelected, active: isActive, inactive: !isActive }"
    class="Player"
  >
    <div class="wrapper relative w-full h-full flex flex-row items-center">
      <ArrowLeft
        :isSelected="isSelected"
        :isActive="isActive"
      />
      <ArrowRight
        v-if="isSelected"
        :isSelected="isSelected"
        :isActive="isActive"
      />
      <div class="bar-bg"></div>

      <div
        :class="{ hasFinder: isShowingFinder }"
        class="search-icon"
        @click="toggleFinder"
      >
        <img src="@/assets/icons/search.svg" class="h-5 w-5" />
      </div>

      <PlayerBar
        :isSelected="isSelected"
        :mouseIsWithinPlayer="mouseIsWithinPlayer"
        :isRunning="isRunning"
        :ticks="ticks"
        :session="session"
        class="flex-1"
      />
    </div>
  </div>
</template>

<script lang="ts">
  import * as Vue from 'vue';
  import ArrowLeft from './ArrowLeft.vue';
  import ArrowRight from './ArrowRight.vue';
  import PlayerBar from './PlayerBar.vue';
  import WindowsController, { EmitterName } from '@/pages/toolbar/lib/WindowsController';

  export default Vue.defineComponent({
    name: 'Player',
    components: {
      ArrowLeft,
      ArrowRight,
      PlayerBar,
    },
    props: ['isSelected', 'isActive', 'ticks', 'isRunning', 'session'],
    emits: ['select'],
    setup() {
      return {
        mouseIsWithinPlayer: Vue.ref(false),
        isShowingFinder: Vue.ref(false),
      }
    },
    methods: {
      handleClick() {
        if (!this.isSelected) {
          event.stopPropagation();
          this.$emit('select');
        }
      },

      toggleFinder(event: MouseEvent) {
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        if (this.isShowingFinder) {
          WindowsController.hideMenuFinder();
        } else {
          WindowsController.showMenuFinder(rect);
          this.isShowingFinder = true;
        }
      },

      finishHideFinder() {
        this.isShowingFinder = false;
      },

      handleMouseLeave() {
        this.mouseIsWithinPlayer = false;
      },

      handleMouseEnter() {
        this.mouseIsWithinPlayer = true;
      },

      // resume() {
      //   Client.send('Session.resume', {
      //     heroSessionId: this.session.heroSessionId,
      //     startLocation: this.startLocation,
      //   });
      // },
    },

    mounted() {
      WindowsController.on(EmitterName.hideMenuFinder, this.finishHideFinder.bind(this));
    },

    beforeUnmount() {
      WindowsController.off(EmitterName.hideMenuFinder, this.finishHideFinder.bind(this));
    }
  });
</script>

<style lang="scss" scoped="scoped">
  @use "sass:math";
  @use "sass:color";
  @import "../variables";

  .Player {
    padding-top: 4px;
    padding-bottom: 4px;
    position: relative;

    &.active {
      .wrapper {
        border-width: 2px;
      }
    }
    &.inactive {
      .ArrowLeft {
        top: -1px;
      }
    }

    &.selected {
      .wrapper {
        margin-left: 0;
        border-color: $borderColorSelected;
        box-shadow: inset 1px 1px 2px $shadowColor;
        background: $bgSelected;
      }
      .search-icon {
        pointer-events: auto;
        padding-left: 21px;
        img {
          opacity: 0.4;
          pointer-events: none;
        }
        &:before {
          background: white;
        }
      }
      .ArrowLeft {
        left: 0;
      }
    }

    &.unselected {
      .wrapper {
        margin-left: 7px;
        width: calc(100% - 9px);

        &:before {
          content: '';
          position: absolute;
          top: -1px;
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
          border-left: 13.5px solid white;
        }
      }
      .bar-bg {
        background-color: color.grayscale(#ECDBF7);
        width: calc(100% - 38px);
        left: 39px;
      }
      .search-icon img {
        opacity: 0.1;
      }
    }

    &.unselected:hover {
      .wrapper {
        background: $bgHover;
        border-color: color.scale($bgHover, $lightness: -5%);
        box-shadow: inset 1px 1px 0 white;
        &:after {
          border-left-color: $bgHover;
        }
      }
      .search-icon:before {
        background: $bgHover;
        img {
          opacity: 0.1;
        }
      }
      .bar-bg {
        background-color: color.scale($bgHover, $lightness: -5%);
        &:after {
          border-left-color: color.scale($bgHover, $lightness: -5%);
        }
      }
    }
  }

  .wrapper {
    width: 100%;
    height: 100%;
    padding-right: 15px;
    border: 1px solid $borderColor;
    border-right: none;
    border-left: none;
    position: relative;
  }

  .search-icon {
    pointer-events: none;
    padding: 6.2px 0px 5px 15px;
    z-index: 10;
    position: relative;
    margin-right: 7px;

    img {
      position: relative;
      z-index: 2;
      opacity: 0.2;
    }

    &:hover img {
      filter: $iconFilterSelected;
      opacity: 1 !important;
    }

    &.hasFinder img {
      filter: $iconFilterSelected;
      opacity: 1 !important;
    }

    &:before {
      content: '';
      position: absolute;
      z-index: 1;
      height: 19px;
      width: 18px;
      top: 4px;
      right: -10px;
      background: white;
      border-radius: 50%;
      z-index: 1;
    }
  }

  .bar-bg {
    opacity: 0.9;
    background-color: #ECDBF7;
    height: 16px;
    top: calc(50% - 8px);
    left: 44px;
    position: absolute;
    z-index: 3;
    pointer-events: none;
    width: calc(100% - 46px);

    &:after {
      content: '';
      position: absolute;
      top: 0;
      right: -7px;
      width: 0;
      height: 0;
      border-top: 8px solid transparent;
      border-bottom: 8px solid transparent;
      border-left: 7px solid #EFE2F7;
    }
  }

  .ArrowRight {
    right: -14px;
    top: -2px;
  }
  .ArrowLeft {
    left: -6px;
  }

  button {
    cursor: default;
  }
</style>
