<template>
  <div id="timeline">
    <div id="bar" @mouseout="trackMouseout" @mouseover="trackMouseover">
      <div id="track" ref="trackDiv">
        <div
          v-for="(url, i) in timeline.urls"
          class="tick"
          :class="{ active: isActiveUrl(i) }"
          :key="url.offsetPercent"
          @click.prevent="clickUrlTick($event, url.navigationId)"
          :style="{ left: url.offsetPercent + '%', width: nextUrlTickWidth(i) }"
        >
          <div v-if="i !== timeline.urls.length - 1" class="line-overlay"></div>
          <div class="marker"></div>
        </div>
        <div
          @mousedown="startDraggingNib()"
          ref="nibDiv"
          id="nib"
          :class="{ 'live-mode': isLive }"
          :style="{ left: value + '%' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { defineComponent, PropType, toRef } from 'vue';
import ITimelineMetadata from '@ulixee/hero-interfaces/ITimelineMetadata';
import Client from '@/api/Client';

export interface ITimelineHoverEvent {
  offset: number;
  pageX: number;
  url: string;
  imageBase64: string;
  status: string;
  domChanges: number;
}
export interface ITimelineChangeEvent {
  offset: string;
  oldValue: string;
  value: number;
}

export default defineComponent({
  name: 'Timeline',
  components: {},
  props: {
    timeline: {
      type: Object as PropType<ITimelineMetadata>,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    activeUrlIndex: Number,
    heroSessionId: String,
    isLive: Boolean,
    isHistoryMode: Boolean,
  },
  emits: ['hover', 'click', 'update:value', 'dragstart', 'dragend', 'mouseout'],
  setup(props) {
    let trackDiv = Vue.ref<HTMLDivElement>();
    let nibDiv = Vue.ref<HTMLDivElement>();
    let trackOffset: DOMRect;
    let screenshotsByTimestamp = new Map<number, string>();
    let screenshotTimestampsByOffset = new Map<number, number>();
    let timelineRef = toRef(props, 'timeline');

    return {
      screenshotsByTimestamp,
      screenshotTimestampsByOffset,
      trackDiv,
      nibDiv,
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
      } as ITimelineHoverEvent;

      let lastChanges = 0;
      for (const paint of this.timeline.paintEvents) {
        // go until this change is after the current offset
        if (paint.offsetPercent > offset) break;
        lastChanges = paint.domChanges;
      }
      hoverEvent.domChanges = lastChanges;
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
      const timestamp = this.screenshotTimestampsByOffset.get(offset);
      hoverEvent.imageBase64 = this.screenshotsByTimestamp.get(timestamp);
      this.$emit('hover', hoverEvent);
    },

    isActiveUrl(index: number) {
      return this.activeUrlIndex === index;
    },

    clickUrlTick(event: MouseEvent, navigationId: number) {
      this.onNibMove(event);
      this.$emit('click', navigationId);
    },

    nextUrlTickWidth(urlIndex: number) {
      if (urlIndex === this.timeline.urls.length - 1) return '2px';
      const diff =
        this.timeline.urls[urlIndex + 1].offsetPercent - this.timeline.urls[urlIndex].offsetPercent;
      return `${diff}%`;
    },

    startDraggingNib() {
      if (this.isLive) return;
      window.addEventListener('mousemove', this.onNibMove);
      this.$emit('dragstart');
    },

    stopDraggingNib() {
      window.removeEventListener('mousemove', this.onNibMove);
      this.$emit('dragend');
    },

    onNibMove(e) {
      e.preventDefault();

      const percentOffset = this.getTrackOffset(e);
      this.$emit('update:value', percentOffset);
    },

    getTrackOffset(event: MouseEvent): number {
      this.trackOffset ??= this.trackDiv.getBoundingClientRect();
      let percentOffset = (100 * (event.pageX - this.trackOffset.x)) / this.trackOffset.width;
      percentOffset = Math.round(10 * percentOffset) / 10;
      if (percentOffset > 100) percentOffset = 100;
      if (percentOffset < 0) percentOffset = 0;
      return percentOffset;
    },

    onTimelineUpdated() {
      let lastOffset: number = null;
      console.log('processing new screenshots');
      this.screenshotTimestampsByOffset.clear();
      if (!this.timeline.screenshots.length) this.screenshotsByTimestamp.clear();

      for (const screenshot of this.timeline.screenshots) {
        if (!this.screenshotsByTimestamp.has(screenshot.timestamp)) {
          // placeholder while retrieving
          this.screenshotsByTimestamp.set(screenshot.timestamp, null);
          Client.send('Session.getScreenshot', {
            timestamp: screenshot.timestamp,
            heroSessionId: this.heroSessionId,
            tabId: screenshot.tabId,
          })
            .then(x => {
              if (x.imageBase64)
                this.screenshotsByTimestamp.set(screenshot.timestamp, x.imageBase64);
              else this.screenshotsByTimestamp.delete(screenshot.timestamp);
            })
            .catch(console.error);
        }

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
  },
  mounted() {
    window.addEventListener('mouseup', this.stopDraggingNib);
  },
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

    #nib {
      position: absolute;
      top: -3px;
      box-sizing: border-box;
      margin-left: -8px;
      height: 16px;
      width: 16px;
      border-radius: 14px;
      background-color: white;
      border: 1px solid #666;
      box-shadow: -1px 1px 2px rgba(0, 0, 0, 0.6);
      -webkit-app-region: no-drag;
      user-select: none;

      &.live-mode {
        opacity: 0.4;
      }
    }
  }
}
</style>
