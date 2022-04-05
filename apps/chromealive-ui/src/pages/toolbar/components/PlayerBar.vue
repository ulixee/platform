<template>
  <div
    class="PlayerBar relative"
    :style="formattedCssVars()"
    :class="{ isSelected: isSelected, notSelected: !isSelected }"
    @mousedown="handleMouseDown($event)"
  >
    <div class="ticks">
      <div
        v-for="(tick, i) in ticks"
        :key="tick.offsetPercent"
        class="tick"
        :class="{ [tick.class]: true }"
        :style="{ left: tick.offsetPercent + '%' }"
        @click.prevent="clickTick($event, tick)"
      >
        <div v-if="i !== tick.length - 1" class="tick-overlay" />
      </div>
    </div>

    <div
      v-if="isSelected"
      class="ghost"
      :class="ghostClass"
    />
    <div
      v-if="isSelected"
      ref="markerElem"
      class="marker"
      :class="{ active: activeItem === 'marker', ...markerClass, [session.playbackState]: 1 }"
      @mousedown="handleMouseDown($event, 'marker')"
    >
      <div class="marker-wrapper">
        <div class="dragger left" @mousedown="handleMouseDown($event, 'draggerLeft')" />
        <div class="dragger right" @mousedown="handleMouseDown($event, 'draggerRight')" />
      </div>

      <div class="play-icon" />
      <div class="pause-icon" />
      <div class="restart-icon">
        <img src="@/assets/icons/refresh.svg" alt="restart">
      </div>

      <div
        class="nib left"
        :class="{ active: activeItem === 'nibLeft' }"
        @mousedown="handleMouseDown($event, 'nibLeft')"
      >
        <div class="arrow-up" />
      </div>
      <div
        class="nib right"
        :class="{ active: activeItem === 'nibRight' }"
        @mousedown="handleMouseDown($event, 'nibRight')"
      >
        <div class="arrow-up" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { PropType } from 'vue';
import Client from '@/api/Client';
import ArrowRight from './ArrowRight.vue';
import ISessionTimetravelEvent from '@ulixee/apps-chromealive-interfaces/events/ISessionTimetravelEvent';
import { ITimelineTick } from '@/pages/toolbar/views/SessionController.vue';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import IAppModeEvent from '@ulixee/apps-chromealive-interfaces/events/IAppModeEvent';

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
  props: {
    isSelected: { type: Boolean },
    mouseIsWithinPlayer: { type: Boolean },
    ticks: {
      type: Array as PropType<ITimelineTick[]>,
    },
    session: {
      type: Object as PropType<IHeroSessionActiveEvent>,
    },
    mode: { type: String as PropType<IAppModeEvent['mode']> },
  },
  emits: [],
  setup(props) {
    const markerElem = Vue.ref<HTMLElement>();
    const trackRect = Vue.ref<DOMRect>();
    let markerRect: DOMRect;

    const ghostClass = Vue.reactive({
      show: false,
      isAtLive: false,
    });

    Vue.watch(
      () => props.mouseIsWithinPlayer,
      mouseIsWithinPlayer => {
        if (mouseIsWithinPlayer) {
          trackRect.value = null;
        } else {
          ghostClass.show = false;
        }
      },
    );

    return {
      trackRect,
      markerRect,
      markerElem,
      activeItem: Vue.ref<ActiveItem | undefined>(),
      mouseDownItem: Vue.ref<MouseDownItem | undefined>(undefined),
      markerClass: Vue.reactive({
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

      lastTimetravelOffset: null as number,
      timetravelTimeout: -1,
      lastTimetravelTimestamp: -1,
    };
  },
  watch: {
    mode(value) {
      if (value === 'Live') {
        this.markerClass.isLive = true;
        this.markerClass.hasMultiple = false;
        this.cssVars.markerLeft = liveMarkerPosition;
        this.cssVars.markerRight = '';
      } else if (value === 'Timetravel') {
        this.markerClass.isLive = false;
      }
    },
  },
  methods: {
    formattedCssVars() {
      return Object.entries(this.cssVars).reduce((byKey, [key, value]) => {
        byKey[`--${key}`] = value;
        return byKey;
      }, {});
    },

    convertLeftMousePctToPixels(pctPos): number {
      const trackRect = this.getTrackBoundingRect();
      return trackRect.width * (pctPos / 100);
    },

    convertGlobalMouseLeftToPct(mousePosX: number): number {
      const trackRect = this.getTrackBoundingRect();
      const pct = ((mousePosX - trackRect.x) / trackRect.width) * 100;

      if (!this.markerClass.hasMultiple && pct >= liveMarkerPosition) {
        return liveMarkerPosition;
      } else if (this.markerClass.hasMultiple && pct >= maxMarkerPosition) {
        return maxMarkerPosition;
      } else if (pct < startMarkerPosition) {
        return startMarkerPosition;
      }
      return pct;
    },

    getTrackBoundingRect(): DOMRect {
      this.trackRect ??= this.$el.getBoundingClientRect();
      return this.trackRect;
    },

    getMarkerBoundingRect(): DOMRect {
      this.markerRect ??= this.markerElem.getBoundingClientRect();
      return this.markerRect;
    },

    handleMouseDown(event: MouseEvent, item?: MouseDownItem) {
      if (event.button !== 0) return;
      if (!this.isSelected) return;

      event.preventDefault();
      event.stopPropagation();

      if (item === MouseDownItem.marker) {
        this.isMaybeClickingPlay = this.markerClass.isLive;
        item = MouseDownItem.nibLeft;
      }
      this.mouseDownItem = item;
      this.trackRect = null;
      this.ghostClass.show = false;
      this.mousedownX = event.pageX;
      this.isMouseDown = true;

      if (!item) {
        this.activeItem = ActiveItem.nibLeft;
        this.markerClass.hasMultiple = false;
        this.cssVars.markerRight = '';
        this.cssVars.markerLeft = this.convertGlobalMouseLeftToPct(event.pageX - 3);
        void this.doTimetravel(true);
      } else if (ActiveItem[item]) {
        this.activeItem = item as unknown as ActiveItem;
      }
      window.addEventListener('mouseup', this.handleMouseup, { once: true });
    },

    handleMouseup(event: MouseEvent) {
      const isMouseDown = this.isMouseDown;
      const isTogglingPlay = this.isMaybeClickingPlay && !this.isMouseDownDragging;

      this.isMouseDown = false;
      this.isMouseDownDragging = false;
      this.isMaybeClickingPlay = false;
      this.mouseDownItem = undefined;
      this.$el.style.cursor = '';
      this.markerRect = null;

      if (!this.isSelected || !isMouseDown) return;
      if (event.button !== 0) return;
      event.preventDefault();

      if (isTogglingPlay) {
        this.togglePlay();
        return;
      }

      const markerPos1 = this.convertLeftMousePctToPixels(this.cssVars.markerLeft);
      const markerPos2 = this.convertLeftMousePctToPixels(this.cssVars.markerRight);
      if (this.markerClass.hasMultiple && Math.abs(markerPos2 - markerPos1) < minPixelForMultiple) {
        this.cssVars.markerRight = '';
        this.markerClass.hasMultiple = false;
        if (this.activeItem === ActiveItem.nibRight) {
          this.activeItem = ActiveItem.nibLeft;
        }
      }

      if (this.activeItem === ActiveItem.nibLeft || this.activeItem === ActiveItem.nibRight) {
        void this.doTimetravel(true);
      }
    },

    togglePlay() {
      if (this.session.playbackState === 'running') {
        this.pauseScript();
      } else if (this.session.playbackState === 'paused') {
        this.resumeScript();
      } else {
        this.restartScript();
      }
    },

    restartScript() {
      void Client.send('Session.resume', {
        heroSessionId: this.session.heroSessionId,
        startLocation: 'sessionStart',
      });
    },

    resumeScript() {
      this.session.playbackState = 'running';
      void Client.send('Session.resume', {
        heroSessionId: this.session.heroSessionId,
        startLocation: 'currentLocation',
      });
    },

    pauseScript() {
      this.session.playbackState = 'paused';
      void Client.send('Session.pause', {
        heroSessionId: this.session.heroSessionId,
      });
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
      if (
        [
          MouseDownItem.nibLeft,
          MouseDownItem.nibRight,
          MouseDownItem.draggerLeft,
          MouseDownItem.draggerRight,
        ].includes(this.mouseDownItem)
      ) {
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
      if (event.pageX > markerLeft - spaceBefore && event.pageX < markerRight + spaceAfter) {
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

      if ([MouseDownItem.nibLeft, MouseDownItem.draggerLeft].includes(this.mouseDownItem)) {
        this.cssVars.markerLeft = mousePctLeft;
      } else {
        this.cssVars.markerRight = mousePctLeft;
      }

      const forceTimetravel = this.markerClass.isLive && mousePctLeft >= liveMarkerPosition;
      void this.doTimetravel(forceTimetravel);
    },

    handleDraggingNew(event: MouseEvent) {
      if (this.markerClass.isLive) return;
      const dragLength = event.pageX - this.mousedownX;
      if (Math.abs(dragLength) < minPixelForMultiple) return;

      this.$el.style.cursor = 'col-resize';
      this.markerClass.hasMultiple = true;

      if (dragLength < 0) {
        const mousePctRight = this.convertGlobalMouseLeftToPct(this.mousedownX + 3);
        const mousePctLeft = this.convertGlobalMouseLeftToPct(this.mousedownX + dragLength - 3);

        this.cssVars.markerRight = mousePctRight;
        this.cssVars.markerLeft = mousePctLeft;
        this.activeItem = ActiveItem.nibLeft;
      } else {
        this.cssVars.markerRight = this.convertGlobalMouseLeftToPct(event.pageX);
        this.activeItem = ActiveItem.nibRight;
      }

      void this.doTimetravel();
    },

    async doTimetravel(force = false) {
      if (!force) {
        if (Date.now() - this.lastTimetravelTimestamp < 250) {
          this.timetravelTimeout ??= setTimeout(this.doTimetravel, 100) as any;
          return;
        }
      }

      const startOffset = this.cssVars.markerLeft;
      const endOffset = this.cssVars.markerRight;
      let percentOffset = startOffset;
      if (this.markerClass.hasMultiple && this.activeItem === ActiveItem.nibRight) {
        percentOffset = endOffset;
      }
      this.markerClass.isLive = percentOffset >= liveMarkerPosition;
      if (this.markerClass.isLive) {
        this.markerClass.hasMultiple = false;
        percentOffset = liveMarkerPosition;
      }

      if (percentOffset === this.lastTimetravelOffset) return;

      clearTimeout(this.timetravelTimeout);
      this.timetravelTimeout = null;
      this.lastTimetravelOffset = startOffset;
      this.lastTimetravelTimestamp = Date.now();
      const heroSessionId = this.session?.heroSessionId;
      if (!heroSessionId) return;

      if (percentOffset >= liveMarkerPosition) {
        if (this.mode !== 'Live') {
          await Client.send('Session.openMode', { mode: 'Live', heroSessionId });
        }
        return;
      }

      await Client.send('Session.timetravel', {
        heroSessionId,
        timelinePercentRange: this.markerClass.hasMultiple
          ? [startOffset, endOffset]
          : [percentOffset, percentOffset],
        percentOffset,
      });
    },

    onTimetraveled(event: ISessionTimetravelEvent): void {
      this.markerClass.isLive = false;
      if (this.mouseDownItem || this.isMouseDown || this.isMouseDownDragging) return;

      if (event.focusedRange) {
        this.markerClass.hasMultiple = true;
        this.cssVars.markerLeft = event.focusedRange[0];
        this.cssVars.markerRight = event.focusedRange[1];
      } else {
        this.markerClass.hasMultiple = false;
        this.cssVars.markerLeft = event.percentOffset;
        this.cssVars.markerRight = event.percentOffset;
      }
    },
  },
  mounted() {
    Client.on('Session.timetravel', this.onTimetraveled);
    window.addEventListener('mousemove', this.handleMousemove.bind(this));
  },
  beforeUnmount() {
    window.removeEventListener('mousemove', this.handleMousemove.bind(this));
  },
});
</script>

<style lang="scss" scoped="scoped">
@use "sass:math";
@import '../variables';

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
  border: 1px solid #9b43c0;
  width: 4px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.7);
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

  &.isLive.running {
    animation: pulse-animation 1s infinite;
    .pause-icon {
      display: block;
    }
    .restart-icon {
      display: none;
    }
  }

  &.isLive.paused {
    animation: pulse-animation 1s infinite;
    .play-icon {
      display: block;
    }
    .restart-icon {
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
    .restart-icon {
      display: block;
    }
    .dragger {
      display: none !important;
    }
    .marker-wrapper {
      border-radius: 50%;
      &:before,
      &:after {
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
    right: calc(100% * (100 - var(--markerRight)) / 100);
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
    background: #ab87bb;
    border: 1px solid #8b5e97;
    border-top: none;
    box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.3);

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
        width: math.div($arrowUpSize, 1.41) * 1px;
        height: math.div($arrowUpSize, 1.41) * 1px;
        position: absolute;
        bottom: 0;
        left: -0.5px;
        background: #ab87bb;
        border: 1px solid #8b5e97;
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
    box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.2);
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
      border: 1.5px solid #9b43c0;
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
  border-left: 9px solid #9a78a8;
}

.restart-icon {
  position: absolute;
  display: none;
  top: calc(50% - 12px);
  left: calc(50% - 12px);
  width: 24px;
  height: 24px;
  img {
    width: 100%;
    height: auto;
    filter: invert(54%) sepia(19%) saturate(699%) hue-rotate(238deg) brightness(91%) contrast(85%);
  }
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
    background: #9a78a8;
  }
  &:after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 3px;
    height: 100%;
    background: #9a78a8;
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
    background: rgba(0, 0, 0, 0.3);
    border-right: 1px solid rgba(255, 255, 255, 0.9);
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
