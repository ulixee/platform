<template>
  <div 
    class="PlayerBar relative" 
    @mousedown="handleMouseDown($event)" 
    :style="formattedCssVars()" 
    :class="{ isSelected: isSelected, notSelected: !isSelected }"
  >
    <div class="ticks">
      <div
        v-for="(tick, i) in ticks"
        class="tick"
        :class="{ [tick.class]: true }"
        :key="tick.offsetPercent"
        @click.prevent="clickTick($event, tick)"
        :style="{ left: tick.offsetPercent + '%' }"
      >
        <div v-if="i !== tick.length - 1" class="tick-overlay"></div>
      </div>
    </div>

    <div class="ghost" v-if="isSelected" :class="ghostClass"></div>
    <div class="marker" v-if="isSelected" ref="markerElem" @mousedown="handleMouseDown($event, 'marker')" :class="{ active: activeItem === 'marker', ...markerClass }">
      <div class="marker-wrapper">
        <div class="dragger left" @mousedown="handleMouseDown($event, 'draggerLeft')"></div>
        <div class="dragger right" @mousedown="handleMouseDown($event, 'draggerRight')"></div>
      </div>

      <div class="play-icon"></div>
      <div class="pause-icon"></div>

      <div class="nib left" @mousedown="handleMouseDown($event, 'nibLeft')" :class="{ active: activeItem === 'nibLeft' }">
        <div class="arrow-up"></div>
      </div>
      <div class="nib right" @mousedown="handleMouseDown($event, 'nibRight')" :class="{ active: activeItem === 'nibRight' }">
        <div class="arrow-up"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import * as Vue from 'vue';
  import Client from '@/api/Client';
  import ArrowRight from './ArrowRight.vue';

  const startMarkerPosition = 0;
  const liveMarkerPosition = 100;
  const maxMarkerPosition = 103;

  const defaultMarkerWidth = 4;
  const minPixelForMultiple = 4;

  enum MouseDownItem {
    draggerLeft = 'draggerLeft',
    draggerRight = 'draggerRight',
    nibLeft = 'nibLeft',
    nibRight = 'nibRight',
    marker = 'marker',
  }

  enum ActiveItem {
    nibLeft = 'nibLeft',
    nibRight = 'nibRight',
    marker = 'marker',
  }

  export default Vue.defineComponent({
    name: 'PlayerBar',
    components: {
      ArrowRight,
    },
    props: ['isSelected', 'mouseIsWithinPlayer', 'isRunning', 'ticks', 'session'],
    emits: ['select'],
    setup(props) {
      const markerElem = Vue.ref<HTMLElement>();
      const trackRect = Vue.ref<DOMRect>();
      let markerRect: DOMRect;

      const ghostClass = Vue.reactive({
        show: false,
        isAtLive: false,
      });

      Vue.watch(() => props.mouseIsWithinPlayer, (mouseIsWithinPlayer) => {
        if (mouseIsWithinPlayer) {
          trackRect.value = null;
        } else {
          ghostClass.show = false;
        }
      });

      return {
        trackRect,
        markerRect,
        markerElem,
        activeItem: Vue.ref<ActiveItem | undefined>(),
        mouseDownItem: Vue.ref<MouseDownItem | undefined>(undefined),
        markerClass: Vue.reactive<any>({
          isLive: true,
          hasMultiple: false,
        }),
        ghostClass,
        cssVars: Vue.ref({
          markerLeft: liveMarkerPosition,
          markerRight: null,
          ghostLeft: 0,
        }),
        mousedownX: 0,
        isMouseDown: Vue.ref(false),
        isMouseDownDragging: Vue.ref(false),
        isMaybeClickingPlay: Vue.ref(false),

        pendingTimetravelOffset: null as number,
        timetravelTimeout: -1,
        lastTimetravelTimestamp: -1,
      }
    },
    methods: {
      formattedCssVars() {
        return Object.entries(this.cssVars).reduce((byKey, [key, value]) => {
          byKey[`--${key}`] = value;
          return byKey;
        }, {});
      },

      nextTickWidth(urlIndex: number) {
        if (urlIndex === this.ticks.length - 1) return '2px';
        const diff = this.ticks[urlIndex + 1].offsetPercent - this.ticks[urlIndex].offsetPercent;
        return `${diff}%`;
      },

      async doTimetravel() {
        if (this.pendingTimetravelOffset === null) return;

        if (Date.now() - this.lastTimetravelTimestamp < 250) {
          if (this.timetravelTimeout) return;
          this.timetravelTimeout = setTimeout(this.doTimetravel, 100) as any;
          return;
        }
        const percentOffset = this.pendingTimetravelOffset;
        this.clearPendingTimetravel();
        await Client.send('Session.timetravel', {
          heroSessionId: this.session?.heroSessionId,
          percentOffset,
        });
      },

      clearPendingTimetravel() {
        clearTimeout(this.timetravelTimeout);
        this.timetravelTimeout = null;
        this.pendingTimetravelOffset = null;
      },

      convertLeftMousePctToPixels(pctPos): number {
        const trackRect = this.getTrackBoundingRect();
        return trackRect.width * (pctPos / 100);
      },

      convertGlobalMouseLeftToPct(mousePosX: number): number {
        const trackRect = this.getTrackBoundingRect();
        return ((mousePosX - trackRect.x) / trackRect.width) * 100;
      },

      getTrackBoundingRect(): DOMRect {
        this.trackRect ??= this.$el.getBoundingClientRect();
        return this.trackRect;
      },

      getMarkerBoundingRect(): DOMRect {
        this.markerRect ??= this.markerElem.getBoundingClientRect();
        return this.markerRect;
      },

      handleMouseDown(event: MouseEvent, item: MouseDownItem | undefined) {
        if (event.button !== 0) return;
        if (!this.isSelected) return;
        event.preventDefault();

        if (item === MouseDownItem.marker) {
          if (!this.markerClass.isLive) {
            event.stopPropagation();
            return;
          } else {
            this.isMaybeClickingPlay = true;
            item = MouseDownItem.nibLeft;
          }
        }
        this.mouseDownItem = item;
        this.trackRect = null;
        this.ghostClass.show = false;
        this.mousedownX = event.pageX;
        this.isMouseDown = true;

        if (!item) {
          this.showMarker(event);
        } else if (ActiveItem[item]) {
          this.activeItem = item as unknown as ActiveItem;
        }

        event.stopPropagation();
      },

      handleMouseup(event: MouseEvent) {
        if (!this.isSelected) return;
        if (event.button !== 0) return;
        event.preventDefault();

        if (this.isMaybeClickingPlay && !this.isMouseDownDragging) {
          this.togglePlay();
        }

        const leftAsRight = 100 - this.cssVars.markerLeft;
        const markerPos1 = this.convertLeftMousePctToPixels(leftAsRight);
        const markerPos2 = this.convertLeftMousePctToPixels(this.cssVars.markerRight);
        if (Math.abs(markerPos1 - markerPos2) < minPixelForMultiple) {
          this.cssVars.markerRight = '';
          this.markerClass.hasMultiple = false;
          this.activeItem = this.activeItem === ActiveItem.nibRight ? ActiveItem.nibLeft : this.activeItem;
          if (this.activeItem === ActiveItem.nibLeft) {
            this.pendingTimetravelOffset = this.cssVars.markerLeft;
            this.doTimetravel();
          }
        }

        this.isMouseDown = false;
        this.isMouseDownDragging = false;
        this.isMaybeClickingPlay = false;
        this.mouseDownItem = undefined;
        this.$el.style.cursor = '';
        this.markerRect = null;
      },

      togglePlay() {
        if (this.markerClass.isPlaying) {
          this.pauseScript();
        } else {
          this.resumeScript();
        }
      },

      resumeScript() {
        this.markerClass.isPlaying = true;

      },

      pauseScript() {
        this.markerClass.isPlaying = false;
      },

      showMarker(event: MouseEvent) {
        this.activeItem = ActiveItem.nibLeft;
        this.markerClass.isLive = false;
        this.markerClass.hasMultiple = false;
        this.cssVars.markerRight = '';
        let markerLeftPct = this.convertGlobalMouseLeftToPct(event.pageX - 3);
        if (markerLeftPct >= 100) {
          markerLeftPct = 100;
          this.markerClass.isLive = true;
        } else if (markerLeftPct < 0) {
          markerLeftPct = 0;
        }
        this.cssVars.markerLeft = markerLeftPct;
        if (!this.markerClass.isLive) {
          this.pendingTimetravelOffset = this.cssVars.markerLeft;
          this.doTimetravel();
        }
      },

      handleMousemove(event: MouseEvent) {
        if (!this.isSelected) return;

        if (!this.isMouseDown) {
          this.tryToShowGhost(event);
          return;
        }

        if (Math.abs(event.pageX - this.mousedownX) >= minPixelForMultiple) {
          this.isMouseDownDragging = true;
        }
        if ([MouseDownItem.nibLeft, MouseDownItem.nibRight].includes(this.mouseDownItem)) {
          this.handleDraggingNib(event);
        } else if ([MouseDownItem.draggerLeft, MouseDownItem.draggerRight].includes(this.mouseDownItem)) {
          this.handleDraggingNib(event);
        } else if (!this.mouseDownItem) {
          this.handleDraggingNew(event);
        }
      },

      tryToShowGhost(event: MouseEvent) {
        if (!this.mouseIsWithinPlayer) {
          this.ghostClass.show = false;
          return;
        }
        const trackRect = this.getTrackBoundingRect();
        if (event.pageX < trackRect.x) {
          this.ghostClass.show = false;
          return;
        }

        const spaceBefore = this.markerClass.isLive ? 1 : 3;
        const spaceAfter = this.markerClass.isLive ? 5 : 3;
        const markerRect = this.getMarkerBoundingRect();
        const markerLeft = markerRect.x;
        const markerRight = markerLeft + markerRect.width;
        if (event.pageX > (markerLeft - spaceBefore) && event.pageX < (markerRight + spaceAfter)) {
          this.ghostClass.show = false;
          return;
        }

        this.ghostClass.isAtLive = false;
        this.ghostClass.show = true;
        let ghostLeftPct = this.convertGlobalMouseLeftToPct(event.pageX - 3);
        if (ghostLeftPct >= liveMarkerPosition) {
          ghostLeftPct = liveMarkerPosition;
          this.ghostClass.isAtLive = true;
        } else if (ghostLeftPct < 0) {
          ghostLeftPct = 0;
        }
        this.cssVars.ghostLeft = ghostLeftPct;
      },

      handleDraggingNib(event: MouseEvent) {
        let mousePctLeft = this.convertGlobalMouseLeftToPct(event.pageX - 3);

        this.markerClass.isLive = false;
        if (!this.markerClass.hasMultiple && mousePctLeft >= liveMarkerPosition) {
          mousePctLeft = liveMarkerPosition;
          this.markerClass.isLive = true;
        } else if (this.markerClass.hasMultiple && mousePctLeft >= maxMarkerPosition) {
          mousePctLeft = maxMarkerPosition;
        } else if (mousePctLeft < startMarkerPosition) {
          mousePctLeft = startMarkerPosition;
        }
        if ([MouseDownItem.nibLeft, MouseDownItem.draggerLeft].includes(this.mouseDownItem)) {
          this.cssVars.markerLeft = mousePctLeft;
        } else {
          this.cssVars.markerRight = 100 - mousePctLeft;
        }

        if (!this.markerClass.isLive) {
          this.pendingTimetravelOffset = this.activeItem === ActiveItem.nibRight ? this.cssVars.markerRight : this.cssVars.markerLeft;
          this.doTimetravel();
        }
      },

      handleDraggingNew(event: MouseEvent) {
        if (this.markerClass.isLive) return;
        const dragLength = event.pageX - this.mousedownX;
        if (Math.abs(dragLength) < minPixelForMultiple) return;

        this.$el.style.cursor = 'col-resize';
        this.markerClass.hasMultiple = true;

        if (dragLength < 0) {
          const mousePctRight = 100 - this.convertGlobalMouseLeftToPct(this.mousedownX + 3)
          let mousePctLeft = this.convertGlobalMouseLeftToPct(this.mousedownX + dragLength - 3);
          if (mousePctLeft >= maxMarkerPosition) {
            mousePctLeft = maxMarkerPosition;
          } else if (mousePctLeft < startMarkerPosition) {
            mousePctLeft = 0;
          }

          this.cssVars.markerRight = mousePctRight;
          this.cssVars.markerLeft = mousePctLeft;
          this.activeItem = ActiveItem.nibLeft;
        } else {
          let mousePctLeft = this.convertGlobalMouseLeftToPct(event.pageX);
          this.markerClass.isLive = false;
          if (mousePctLeft >= maxMarkerPosition) {
            mousePctLeft = maxMarkerPosition;
          } else if (mousePctLeft < startMarkerPosition) {
            mousePctLeft = 0;
          }

          const mousePctRight = 100 - mousePctLeft;
          this.cssVars.markerRight = mousePctRight;
          this.activeItem = ActiveItem.nibRight;
        }

        this.pendingTimetravelOffset = this.activeItem === ActiveItem.nibRight ? this.cssVars.markerRight : this.cssVars.markerLeft;
        this.doTimetravel();
      }
    },
    mounted() {
      window.addEventListener('mouseup', this.handleMouseup);
      window.addEventListener('mousemove', this.handleMousemove.bind(this));
    },
    beforeUnmount() {
      window.removeEventListener('mousemove', this.handleMousemove.bind(this));
    },
  });
</script>

<style lang="scss" scoped="scoped">
  @use "sass:math";
  @import "../variables";

  .PlayerBar {
    height: 100%;

    &.notSelected {
      .ticks {
        display: none;
      }
    }
  }

  .ghost {
    position: absolute;
    top: -4px;
    left: calc(100% * var(--ghostLeft) / 100);
    height: calc(100% + 8px);
    border: 1px solid #9B43C0;
    width: 4px;
    border-radius: 5px;
    background: rgba(255,255,255,0.7);
    z-index: 11;
    display: none;
    opacity: 0.5;
    &.show {
      display: block;
    }
    &.isAtLive {
      width: 31px;
      height: 31px;
      top: -1.5px;
      border-radius: 50%;
      margin-left: -13px;
    }
  }

  .marker {
    position: absolute;
    top: -4px;
    height: calc(100% + 8px);
    min-width: 4px;
    z-index: 12;
    left: calc(100% * var(--markerLeft) / 100);

    &.isLive.isPlaying {
      animation: pulse-animation 1s infinite;
      .pause-icon {
        display: block;
      }
      .play-icon {
        display: none;
      }
    }

    @keyframes pulse-animation {
      0% {
        box-shadow: 0 0 0 0px rgba(169, 36, 223, 0.5);
      }
      100% {
        box-shadow: 0 0 0 10px rgba(169, 36, 223, 0);
      }
    }

    &.isLive {
      width: 32px;
      height: 32px;
      top: -2.5px;
      border-radius: 50%;
      margin-left: -13px;
      &:hover {
        box-shadow: 1px 1px 3px 2px rgba(95, 0, 134, 0.3);
      }
      .play-icon {
        display: block;
      }
      .dragger {
        display: none !important;
      }
      .marker-wrapper {
        border-radius: 50%;
        &:before, &:after {
          border-radius: 50%;
        }
        &:after {
          background: white;
        }
      }
      .nib {
        display: none !important;
      }
    }

    &.hasMultiple {
      right: calc(100% * var(--markerRight) / 100);
      .dragger {
        display: block;
      }
    }

    &.hasMultiple {
      .nib {
        display: block;
      }
    }

    .nib {
      position: absolute;
      display: none;
      z-index: 5;
      top: calc(100% + 2px);
      width: 14px;
      height: 6px;
      background: #AB87BB;
      border: 1px solid #8B5E97;
      border-top: none;
      box-shadow: 1px 1px 4px rgba(0,0,0,0.3);

      &.left {
        left: -5px;
        display: block;
      }
      &.right {
        right: -5px;
      }
      &.active {
        background: white;
        .arrow-up:before {
          background: white;
        }
      }

      $arrowUpSize: 14.6;
      .arrow-up {
        width: #{$arrowUpSize}px;
        height: #{$arrowUpSize}px;
        overflow: hidden;
        position: absolute;
        bottom: 100%;
        left: -1px;

        &::before {
          content: '';
          display: block;
          width:  math.div($arrowUpSize, 1.41) * 1px;
          height: math.div($arrowUpSize, 1.41) * 1px;
          position: absolute;
          bottom: 0;
          left: -0.5px;
          background: #AB87BB;
          border: 1px solid #8B5E97;
          transform: rotate(45deg);
          transform-origin: 0 100%;
        }
      }
    }

    .marker-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: 5px;
      box-shadow: 1px 1px 3px rgba(0,0,0,0.1);
      background: rgba(255,255,255,0.2);
      &:before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 3px solid white;
        border-radius: 5px;
      }

      &:after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 1.5px solid #9B43C0;
        border-radius: 5px;
      }
    }

    .dragger {
      position: absolute;
      display: none;
      top: 0;
      height: 100%;
      width: 2px;
      cursor: col-resize;
      z-index: 1;
      &.left {
        left: 0;
      }
      &.right {
        right: 0;
      }
    }
  }

  .play-icon {
    position: absolute;
    display: none;
    top: calc(50% - 8px);
    left: calc(50% - 3px);
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    border-left: 9px solid #9A78A8;
  }

  .pause-icon {
    position: absolute;
    display: none;
    top: calc(50% - 8px);
    left: calc(50% - 5px);
    width: 10px;
    height: 16px;
    &:before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 3px;
      height: 100%;
      background: #9A78A8;
    }
    &:after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 3px;
      height: 100%;
      background: #9A78A8;
    }
  }

  .ticks {
    position: absolute;
    width: 100%;
    left: 0;
    height: 24px;
    top: calc(50% - 12px);
    z-index: 5;
    .tick {
      position: absolute;
      width: 2px;
      background: rgba(0,0,0,0.3);
      border-right: 1px solid rgba(255,255,255,0.9);
      top: 0;
      height: 100%;
    }
  }

  .ArrowRight {
    right: -27px;
  }
  
  button {
    cursor: default;
  }
</style>
