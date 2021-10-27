<template>
  <div id="timeline">
    <div id="bar" @mouseout="trackMouseout" @mouseover="trackMouseover">
      <div id="track" ref="trackDiv">
        <div
          v-for="(tick, i) in ticks"
          class="tick"
          :class="{ active: isActiveTick(i), [tick.class]: true }"
          :key="tick.offsetPercent"
          @click.prevent="clickTick($event, tick)"
          :style="{ left: tick.offsetPercent + '%', width: nextTickWidth(i) }"
        >
          <div v-if="i !== tick.length - 1" class="line-overlay"></div>
          <div class="marker"></div>
        </div>
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { defineComponent, PropType, toRef } from 'vue';
import ITimelineMetadata from '@ulixee/hero-interfaces/ITimelineMetadata';
import * as screenshotCache from '@/utils/screenshotCache';

export interface ITimelineHoverEvent {
  offset: number;
  pageX: number;
  url: string;
  imageBase64: string;
  status: string;
  domChanges: number;
  closestTick: ITimelineTick;
}
export interface ITimelineChangeEvent {
  offset: string;
  oldValue: string;
  value: number;
}

export interface ITimelineTick {
  offsetPercent: number;
  class: string;
  id?: string | number;
}

export default defineComponent({
  name: 'Timeline',
  components: {},
  props: {
    timeline: {
      type: Object as PropType<ITimelineMetadata>,
      required: true,
    },
    ticks: {
      type: Array as PropType<ITimelineTick[]>,
      required: true,
    },
    activeTickIndex: Number,
    heroSessionId: String,
    tabId: Number,
  },
  emits: ['hover', 'click', 'mouseout'],
  setup(props) {
    let trackDiv = Vue.ref<HTMLDivElement>();
    let trackOffset: DOMRect;
    let screenshotTimestampsByOffset = new Map<number, number>();
    let timelineRef = toRef(props, 'timeline');

    return {
      screenshotTimestampsByOffset,
      trackDiv,
      trackOffset,
      timelineRef,
    };
  },
  methods: {
    trackMouseout() {
      window.removeEventListener('mousemove', this.trackMousemove);
      this.$emit('mouseout');
    },

    trackMouseover() {
      // make sure not to track twice
      window.removeEventListener('mousemove', this.trackMousemove);
      window.addEventListener('mousemove', this.trackMousemove);
    },

    trackMousemove(event: MouseEvent) {
      const offset = this.getTrackOffset(event);

      const hoverEvent = {
        offset,
        pageX: event.pageX,
        domChanges: 0,
      } as ITimelineHoverEvent;

      for (const paint of this.timeline.paintEvents) {
        // find a close event
        if (Math.abs(paint.offsetPercent - offset) < 0.05) {
          hoverEvent.domChanges = paint.domChanges;
          break;
        }
      }
      hoverEvent.status = 'Loading';

      let loadedUrl: ITimelineMetadata['urls'][0] = null;
      for (const url of this.timeline.urls) {
        if (url.offsetPercent > offset) break;
        loadedUrl = url;
      }
      if (loadedUrl?.url) {
        let statusText = 'Navigation Requested';
        if (offset === 100) statusText = 'Current Location';

        for (const { status, offsetPercent } of loadedUrl.loadStatusOffsets) {
          if (offsetPercent > offset) break;
          statusText = status;
        }

        hoverEvent.status = statusText;
      }
      hoverEvent.url = loadedUrl?.url;
      for (const tick of this.ticks) {
        if (tick.offsetPercent > offset) break;
        hoverEvent.closestTick = tick;
      }

      const timestamp = this.screenshotTimestampsByOffset.get(offset);
      hoverEvent.imageBase64 = screenshotCache.get(this.heroSessionId, this.tabId, timestamp);
      this.$emit('hover', hoverEvent);
    },

    isActiveTick(index: number) {
      return this.activeTickIndex === index;
    },

    clickTick(event: MouseEvent, tick: any) {
      this.$emit('click', event, tick);
    },

    nextTickWidth(urlIndex: number) {
      if (urlIndex === this.ticks.length - 1) return '2px';
      const diff = this.ticks[urlIndex + 1].offsetPercent - this.ticks[urlIndex].offsetPercent;
      return `${diff}%`;
    },

    getTrackBoundingRect(): DOMRect {
      this.trackOffset ??= this.trackDiv.getBoundingClientRect();
      return this.trackOffset;
    },

    getTrackOffsetPercent(percent = 100): number {
      const rect = this.getTrackBoundingRect();
      const width = Math.floor(percent * rect.width) / 100;
      return width + rect.x;
    },

    getTrackOffset(event: MouseEvent): number {
      const trackRect = this.getTrackBoundingRect();
      let percentOffset = (100 * (event.pageX - trackRect.x)) / trackRect.width;
      percentOffset = Math.round(10 * percentOffset) / 10;
      if (percentOffset > 100) percentOffset = 100;
      if (percentOffset < 0) percentOffset = 0;
      return percentOffset;
    },

    onTimelineUpdated() {
      let lastOffset: number = null;
      this.screenshotTimestampsByOffset.clear();

      for (const screenshot of this.timeline.screenshots) {
        screenshotCache.process(this.heroSessionId, screenshot);
        let offsetPercent = Math.round(100 * screenshot.offsetPercent) / 100;
        if (lastOffset !== null) {
          this.fillScreenshotSlots(lastOffset, offsetPercent);
        }

        this.screenshotTimestampsByOffset.set(offsetPercent, screenshot.timestamp);

        lastOffset = offsetPercent;
      }
      if (lastOffset) this.fillScreenshotSlots(lastOffset, 100);
      const lastScreenshot = this.timeline.screenshots[this.timeline.screenshots.length - 1];
      if (lastScreenshot) this.screenshotTimestampsByOffset.set(100, lastScreenshot.timestamp);
    },

    fillScreenshotSlots(startOffset: number, endOffset: number) {
      let lastOffset = startOffset;
      const timestampOfPrevious = this.screenshotTimestampsByOffset.get(lastOffset);
      while (lastOffset + 0.01 < endOffset) {
        this.screenshotTimestampsByOffset.set(lastOffset, timestampOfPrevious);
        lastOffset = Math.round(100 * (lastOffset + 0.01)) / 100;
      }
    },
  },
  created() {
    Vue.watch(
      () => this.timelineRef.screenshots,
      () => this.onTimelineUpdated(),
    );
    this.onTimelineUpdated();
  },
  beforeUnmount() {
    window.removeEventListener('mousemove', this.trackMousemove);
  }
});
</script>

<style lang="scss">
@import '../assets/style/resets';

#timeline {
  flex: 3;
  position: relative;
  padding: 5px 10px;

  #bar {
    position: relative;
    height: 40px;
    padding-top: 17px;
    -webkit-app-region: no-drag;

    #track {
      user-select: none;
      position: relative;
      height: 12px;
      top: 5px;
      background-color: #ccc;
    }

    .tick {
      height: 40px;
      top: -15px;
      position: absolute;
      min-width: 2px;

      .marker {
        position: absolute;
        top: 13px;
        left: 0;
        height: 15px;
        width: 2px;
        background-color: #2d2d2d;
        opacity: 0.5;
        border-left: 1px white solid;
        border-right: 1px white solid;
      }

      .line-overlay {
        height: 10px;
        top: 16px;
        position: relative;
      }

      &:hover {
        .marker {
          opacity: 0.8;
        }
        .line-overlay {
          background-color: #aeadad;
        }

        & + .active {
          .marker {
            opacity: 0.6;
          }
          .line-overlay {
            background-color: transparent;
          }
        }
      }

      &.active {
        .line-overlay {
          background-color: #868686;
        }
      }
    }
  }
}
</style>
