<template>
  <div
    :class="{
      isSelected: isSelected,
      notSelected: !isSelected,
      isFocused: isFocused,
      notFocused: !isFocused,
    }"
    class="Player"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="wrapper relative w-full h-full flex flex-row items-center">
      <div class="backgrounds">
        <div class="left-notch" />
        <div class="right-arrow" />
      </div>

      <Borders :is-selected="isSelected" :is-focused="isFocused" />

      <div class="address-bar relative h-full flex flex-row">
        <div v-if="isLiveMode" class="live-icon">
          <div v-if="session.playbackState !== 'finished'" class="text">
            LIVE
          </div>
          <div v-else class="text">
            DONE
          </div>
        </div>
        <div v-else class="timetravel-icon">
          <img src="@/assets/icons/timetravel.svg" class="h-5 w-5">
        </div>

        <div class="address" @click="toggleUrlMenu">
          <div class="text">
            {{ currentUrl }}
          </div>
        </div>
        <div
          :class="{ hasFinder: isShowingFinder }"
          class="search-icon"
          @click="toggleFinder"
        >
          <img src="@/assets/icons/search.svg" class="h-5 w-5">
        </div>
      </div>

      <div class="player-wrapper relative flex-1 h-full flex flex-row items-center">
        <div class="bar-bg" />
        <PlayerBar
          :is-selected="isSelected && !isShowingFinder"
          :mouse-is-within-player="mouseIsWithinPlayer"
          :ticks="ticks"
          :session="session"
          :mode="mode"
          class="flex-1"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import ArrowRight from './ArrowRight.vue';
import PlayerBar from './PlayerBar.vue';
import Borders from './Borders.vue';
import WindowsController, { EmitterName } from '@/pages/toolbar/lib/WindowsController';

export default Vue.defineComponent({
  name: 'Player',
  components: {
    ArrowRight,
    PlayerBar,
    Borders,
  },
  props: ['isSelected', 'isFocused', 'ticks', 'session', 'mode', 'timetravel'],
  emits: ['select', 'toggleFinder'],
  setup(props) {
    const isLiveMode = Vue.computed(() => props.mode === 'Live');
    const isShowingFinder = Vue.computed(() => props.mode === 'Finder');
    const currentUrl = Vue.computed(() => {
      let url = 'about:blank';
      if (props.mode === 'Live' || props.mode === 'Finder' && !props.timetravel) {
        const urls = props.session?.timeline?.urls;
        if (urls.length) {
          url = urls[urls.length - 1]?.url;
        }
      } else {
        url = props.timetravel?.url;
      }
      if (!url) url = 'about:blank';
      if (url.endsWith('/')) url = url.slice(0, -1);
      return url.replace('https://', '').replace('http://', '');
    });

    return {
      currentUrl,
      isShowingUrlMenu: Vue.ref(false),
      mouseIsWithinPlayer: Vue.ref(false),
      isLiveMode,
      isShowingFinder,
    };
  },
  watch: {
    isShowingFinder(value) {
      if (!value) WindowsController.hideMenuFinder();
    },
  },
  methods: {
    handleClick(event) {
      if (!this.isSelected) {
        event.stopPropagation();
        this.$emit('select');
      }
    },

    toggleFinder(event: MouseEvent) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      let isShowingFinder = true;
      if (this.mode === 'Finder') {
        WindowsController.hideMenuFinder();
        isShowingFinder = false;
      } else {
        WindowsController.showMenuFinder(rect);
        isShowingFinder = true;
      }
      this.$emit('toggleFinder', isShowingFinder);
    },

    toggleUrlMenu(event: MouseEvent) {
      const rect = (event.target as HTMLElement).parentElement.getBoundingClientRect();
      if (this.isShowingUrlMenu) {
        WindowsController.hideMenuUrl();
      } else {
        WindowsController.showMenuUrl(rect);
      }
      this.isShowingUrlMenu = !this.isShowingUrlMenu;
    },

    finishHideFinder() {
      this.$emit('toggleFinder', false);
    },

    handleMouseLeave() {
      this.mouseIsWithinPlayer = false;
    },

    handleMouseEnter() {
      this.mouseIsWithinPlayer = true;
    },
  },

  mounted() {
    WindowsController.on(EmitterName.hideMenuFinder, this.finishHideFinder.bind(this));
  },

  beforeUnmount() {
    WindowsController.off(EmitterName.hideMenuFinder, this.finishHideFinder.bind(this));
  },
});
</script>

<style lang="scss" scoped="scoped">
@use "sass:math";
@use "sass:color";
@import '../variables';

.Player {
  position: relative;
  padding-top: 4px;
  padding-bottom: 4px;
  margin-right: 12px;

  &.isSelected {
    .backgrounds {
      background: $bgColorSelected;
    }
    .search-icon {
      img {
        opacity: 0.4;
        pointer-events: none;
      }
      &:after {
        background: white;
      }
    }
    .timetravel-icon {
      img {
        opacity: 0.7;
        pointer-events: none;
      }
    }
  }

  &.notSelected {
    .address-bar {
      pointer-events: none;
    }
    .bar-bg {
      background-color: transparent;
      &:after {
        display: none;
      }
    }
    .search-icon {
      display: none;
      img {
        opacity: 0.2;
      }
    }
    .timetravel-icon {
      img {
        opacity: 0.2;
      }
    }
    .live-icon,
    .address {
      opacity: 0.4;
    }
  }

  &.notSelected:hover {
    .backgrounds {
      background: $bgColorHover;
      .right-arrow {
        border-left-color: $bgColorHover;
      }
    }
    .search-icon {
      display: block;
      &:after {
        background: $bgColorHover;
      }
    }
    .bar-bg {
      background-color: color.scale($bgColorHover, $lightness: -5%);
      &:after {
        display: block;
        border-left-color: color.scale($bgColorHover, $lightness: -5%);
      }
    }
  }
}

.wrapper {
  width: 100%;
  height: 100%;
  border-right: none;
  border-left: none;
  position: relative;
}

.backgrounds {
  position: absolute;
  left: -4px;
  top: 0;
  width: calc(100% + 4px);
  height: 100%;
  background: $bgColor;
  .left-notch {
    content: '';
    position: absolute;
    top: 0.2px;
    left: 0;
    width: 0;
    height: 0;
    border-top: 14px solid transparent;
    border-bottom: 14px solid transparent;
    border-left: 13px solid white;
  }

  .right-arrow {
    content: '';
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

.live-icon {
  padding: 6.2px 3px 5px 10px;
  z-index: 10;
  position: relative;
  margin-left: 5px;

  &:hover .text {
    background: $textColorSelected;
  }
  .text {
    background: #7c7e85;
    color: white;
    font-size: 12px;
    padding: 2px 5px;
    line-height: 12px;
    border-radius: 3px;
  }
}

.search-icon {
  padding: 6.2px 0px 5px 8px;
  z-index: 10;
  position: absolute;
  right: 7px;

  &:before {
    content: '';
    position: absolute;
    top: 6px;
    bottom: 5px;
    width: calc(100% + 7px);
    left: 0;
    border-left: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 0 15px 20px 0;
    z-index: 2;
  }

  img {
    position: relative;
    z-index: 2;
    opacity: 0.2;
  }

  &:hover {
    &:before {
      background: rgba($bgColorHover, 0.5);
      border-left: none;
    }
    img {
      filter: $iconFilterSelected;
      opacity: 1 !important;
    }
  }

  &.hasFinder img {
    filter: $iconFilterSelected;
    opacity: 1 !important;
  }

  &:after {
    content: '';
    position: absolute;
    height: 19px;
    width: 18px;
    top: 4px;
    right: -10px;
    background: $bgColor;
    border-radius: 50%;
    z-index: 1;
  }
}

.timetravel-icon {
  margin-left: 10px;
  padding: 6.2px 3px 5px 3px;
  z-index: 10;

  img {
    position: relative;
    z-index: 2;
    opacity: 0.2;
  }

  &:hover {
    img {
      filter: $iconFilterSelected;
      opacity: 1 !important;
    }
  }

  &.hasFinder img {
    filter: $iconFilterSelected;
    opacity: 1 !important;
  }
}

.bar-bg {
  opacity: 0.9;
  background-color: #ecdbf7;
  height: 16px;
  top: calc(50% - 8px);
  left: 0;
  position: absolute;
  z-index: 3;
  pointer-events: none;
  width: 100%;

  &:after {
    content: '';
    position: absolute;
    top: 0;
    right: -7px;
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    border-left: 7px solid #efe2f7;
  }
}

.address-bar {
  position: relative;

  .address {
    min-width: 200px;
    line-height: 12px;
    color: #202124;
    padding: 6.2px 5px 5px 1px;
    margin-right: 32px;
    text-shadow: 1px 1px 0 white;

    &:hover .text {
      background: rgba($bgColorHover, 0.7);
    }

    .text {
      padding: 1px 5px 3px 5px;
      line-height: 12px;
      border-radius: 2px;
    }
  }
}
</style>
