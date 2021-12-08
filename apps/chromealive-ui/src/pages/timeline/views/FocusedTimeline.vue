<template>
  <div id="FocusedTimelinePage">
    <div id="chrome-alive-bar" ref="toolbarDiv">
      <div id="timeline-bar" v-if="focusedSession">
        <select class="change-state-select">
          <option>--Assign this world to a state--</option>
          <option
            v-for="state of states"
            @click.prevent="moveSessionToState(state.state)"
            :value="state.state"
            :selected="state.heroSessionIds.includes(focusedSession.id)"
          >
            {{ state.state }}
          </option>
        </select>

        <div class="session-preview">
          <span class="times">{{ formattedTimeRange(focusedSession) }}</span>
        </div>
        <Timeline
          @hover="onTimelineHover"
          @mouseout="onTimelineMouseout"
          :hero-session-id="focusedSession.id"
          :timeline="focusedSession.timeline"
          :ticks="timelineTicks"
          ref="timelineRef"
        >
          <div
            id="drag-range"
            :style="{
              left: `calc(${timelineOffsetLeft}% - 17px)`,
              width: `calc(${timelineOffsetRight - timelineOffsetLeft}% + 37px)`,
            }"
          >
            <TimelineHandle
              id="dragLeft"
              :class="{ focused: focusedTimelineHandle === 'start' }"
              @click="focusSessionTimeHandle(true)"
              @dragstart="timelineHandleDragstart(true)"
              @dragend="timelineHandleDragend"
              @drag="leftTimelineHandleDrag"
            ></TimelineHandle>

            <TimelineHandle
              id="dragRight"
              :class="{ focused: focusedTimelineHandle === 'end' }"
              @click="focusSessionTimeHandle(false)"
              @dragstart="timelineHandleDragstart(false)"
              @dragend="timelineHandleDragend"
              @drag="rightTimelineHandleDrag"
            ></TimelineHandle>
          </div>
        </Timeline>
        <div class="button-panel">
          <a
            href="javascript:void(0)"
            @click.prevent="extendSession()"
            id="extend-session"
            :class="{ loading: extendingSession }"
            >Add 5 seconds</a
          >
        </div>
      </div>
    </div>
    <TimelineHover
      :style="{ display: showTimelineHover ? 'flex' : 'none' }"
      :runtimeMs="focusedTimelineMs()"
      :hoverEvent="timelineHover"
    ></TimelineHover>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import Timeline, { ITimelineHoverEvent, ITimelineTick } from '@/components/Timeline.vue';
import IPageStateUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IPageStateUpdatedEvent';
import * as screenshotCache from '@/utils/screenshotCache';
import TimelineHandle from '@/components/TimelineHandle.vue';
import TimelineHover from '@/components/TimelineHover.vue';
import { LoadStatus } from '@ulixee/hero-interfaces/Location';

export default Vue.defineComponent({
  name: 'FocusedTimeline',
  components: { Timeline, TimelineHover, TimelineHandle },
  props: {
    pageStateId: String,
  },
  setup() {
    return {
      timelineHover: Vue.reactive({} as ITimelineHoverEvent),
      showTimelineHover: Vue.ref(false),

      detailsWindow: Vue.ref<Window>(null),

      toolbarDiv: Vue.ref<HTMLDivElement>(),

      pendingTimetravelOffset: null as number,
      pendingTimetravelIsStart: false,

      activePageStateId: null as string,

      extendingSession: Vue.ref<boolean>(false),
      focusedTimelineHandle: Vue.ref<'start' | 'end'>(null),

      timelineOffsetLeft: Vue.ref<Number>(0),
      timelineOffsetRight: Vue.ref<Number>(100),
      timelineRef: Vue.ref<typeof Timeline>(),
      isDragging: Vue.ref<boolean>(false),
      isAwaitingDragUpdate: Vue.ref<boolean>(false),

      states: Vue.ref<IPageStateUpdatedEvent['states']>([]),

      focusedSession: Vue.ref<IPageStateUpdatedEvent['heroSessions'][0]>(),
    };
  },
  computed: {
    timelineTicks(): ITimelineTick[] {
      const focusedSession = this.focusedSession;
      if (!focusedSession) return [];
      const ticks: ITimelineTick[] = [];
      const offsets = new Set<number>();
      for (const url of focusedSession.timeline.urls) {
        if (url.offsetPercent !== -1) {
          ticks.push({
            id: url.navigationId,
            offsetPercent: url.offsetPercent,
            class: 'url',
          });
          offsets.add(url.offsetPercent);
        }
        for (const status of url.loadStatusOffsets) {
          if (status.offsetPercent < 0) continue;

          if (
            status.loadStatus === LoadStatus.DomContentLoaded ||
            status.loadStatus === LoadStatus.AllContentLoaded
          ) {
            offsets.add(status.offsetPercent);
            ticks.push({
              offsetPercent: status.offsetPercent,
              class: status.loadStatus.toLowerCase(),
            });
          }
        }
      }

      for (const paintEvent of focusedSession.timeline.paintEvents) {
        if (offsets.has(paintEvent.offsetPercent)) continue;
        offsets.add(paintEvent.offsetPercent);

        ticks.push({
          offsetPercent: paintEvent.offsetPercent,
          class: 'default',
        });
      }

      for (const storageEvent of focusedSession.timeline.storageEvents) {
        if (offsets.has(storageEvent.offsetPercent)) continue;
        offsets.add(storageEvent.offsetPercent);

        ticks.push({
          offsetPercent: storageEvent.offsetPercent,
          class: 'default',
        });
      }

      for (const offsetPercent of focusedSession.timelineOffsetPercents) {
        if (offsets.has(offsetPercent)) continue;
        ticks.push({
          offsetPercent,
          class: 'default',
        });
      }

      ticks.push({
        offsetPercent: 100,
        class: 'default',
      });

      ticks.sort((a, b) => a.offsetPercent - b.offsetPercent);

      return ticks;
    },
  },
  methods: {
    formattedTimeRange(session: IPageStateUpdatedEvent['heroSessions'][0]): string {
      const begin = session.timelineRange[0];
      const [start, end] = session.loadingRange;
      let startSecs = String(Math.floor((10 * (start - begin)) / 1e3) / 10);
      if (!startSecs.includes('.')) startSecs += '.0';

      let endSecs = String(Math.floor((10 * (end - begin)) / 1e3) / 10);
      if (!endSecs.includes('.')) endSecs += '.0';

      return `${startSecs}s-${endSecs}s`;
    },
    extendSession(): void {
      if (this.extendingSession) return;
      this.extendingSession = true;
      Client.send('PageState.extendSessionTime', {
        heroSessionId: this.focusedSession?.id,
        addMillis: 5e3,
      })
        .catch(alert)
        .then(() => {
          this.extendingSession = false;
        });
    },

    focusedTimelineMs(): number {
      const session = this.focusedSession;
      if (session?.timelineRange?.length)
        return session.timelineRange[1] - session.timelineRange[0];
      return 0;
    },

    timelineHandleDragstart(isStartHandle: boolean): void {
      this.isDragging = true;
      this.focusedTimelineHandle = isStartHandle ? 'start' : 'end';
    },

    timelineHandleDragend(): void {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.updateSessionTimes().catch(console.error);
    },

    leftTimelineHandleDrag(event: MouseEvent): void {
      const closestTick = this.timelineRef.getClosestTick(event, true);
      // don't allow overlap
      if (closestTick.offsetPercent >= this.timelineOffsetRight) return;

      if (this.focusedSession && closestTick.offsetPercent !== this.timelineOffsetLeft) {
        this.pendingTimetravelOffset = closestTick.offsetPercent;
        this.pendingTimetravelIsStart = true;
      }
      this.timelineOffsetLeft = closestTick.offsetPercent;
    },

    rightTimelineHandleDrag(event: MouseEvent): void {
      const closestTick = this.timelineRef.getClosestTick(event, false);
      // don't allow overlap
      if (closestTick.offsetPercent <= this.timelineOffsetLeft) return;

      if (this.focusedSession && closestTick.offsetPercent !== this.timelineOffsetRight) {
        this.pendingTimetravelOffset = closestTick.offsetPercent;
        this.pendingTimetravelIsStart = false;
      }
      this.timelineOffsetRight = closestTick.offsetPercent;
    },

    onTimelineHover(hoverEvent: ITimelineHoverEvent): void {
      if (!hoverEvent.closestTickAbove && !hoverEvent.closestTickBelow) return;
      let offset =
        hoverEvent.closestTickAbove?.offsetPercent ?? hoverEvent.closestTickBelow?.offsetPercent;

      // if not dragging, hover on closest overall
      if (!this.isDragging && hoverEvent.closestTickAbove && hoverEvent.closestTickBelow) {
        const diffAbove = Math.abs(hoverEvent.closestTickAbove.offsetPercent - hoverEvent.offset);
        const diffBelow = Math.abs(hoverEvent.closestTickBelow.offsetPercent - hoverEvent.offset);
        if (diffAbove < diffBelow) offset = hoverEvent.closestTickAbove.offsetPercent;
        else offset = hoverEvent.closestTickBelow.offsetPercent;
      } else if (this.focusedTimelineHandle !== 'start') {
        offset = hoverEvent.closestTickBelow?.offsetPercent;
      }

      const stats = this.timelineRef.getTimelineStats(offset);
      const pageX = this.timelineRef.getPageXByOffsetPercent(offset);
      Object.assign(
        this.timelineHover,
        {
          pageX,
          offset,
        },
        stats,
      );
      this.showTimelineHover = true;
    },

    onTimelineMouseout(): void {
      if (this.isDragging) return;
      this.showTimelineHover = false;
    },

    moveSessionToState(stateName: string): void {
      const sessionId = this.focusedSession.id;
      Client.send('PageState.addState', {
        state: stateName,
        heroSessionIds: [sessionId],
      }).catch(alert);
      for (const state of this.states) {
        const idx = state.heroSessionIds.indexOf(sessionId);
        if (idx >= 0) state.heroSessionIds.splice(idx, 1);

        if (idx === -1 && state.state === stateName) {
          state.heroSessionIds.push(sessionId);
        }
      }
    },

    async updateSessionTimes() {
      if (this.pendingTimetravelOffset === null) return;
      const percentOffset = this.pendingTimetravelOffset;
      this.isAwaitingDragUpdate = true;
      await Client.send('PageState.modifySessionTimes', {
        heroSessionId: this.focusedSession.id,
        isStartTime: this.pendingTimetravelIsStart,
        timelineOffset: percentOffset,
      })
        .catch(console.error)
        .then(() => {
          this.pendingTimetravelOffset = null;
          this.isAwaitingDragUpdate = false;
        });
    },

    async focusSessionTimeHandle(isStartTime: boolean): Promise<void> {
      if (this.pendingTimetravelOffset) return;
      this.focusedTimelineHandle = isStartTime ? 'start' : 'end';
      this.isAwaitingDragUpdate = true;
      await Client.send('PageState.focusSessionTime', {
        heroSessionId: this.focusedSession.id,
        isStartTime,
      })
        .catch(console.error)
        .then(() => {
          this.isAwaitingDragUpdate = false;
        });
    },

    onPageStateUpdatedEvent(message: IPageStateUpdatedEvent) {
      if (message === null) {
        this.activePageStateId = null;
        this.states.length = 0;
        this.focusedSession = null;
        return;
      }

      this.activePageStateId = message.id;

      this.states.length = 0;
      if (message.states) {
        this.states.push(...message.states);
      }

      this.focusedSession = message.heroSessions.find(x => x.id === message.focusedHeroSessionId);
      const focusedSession = this.focusedSession;

      if (!focusedSession) return;

      if (!this.isDragging && !this.isAwaitingDragUpdate) {
        this.timelineOffsetLeft = focusedSession.timelineOffsetPercents[0];
        this.timelineOffsetRight = focusedSession.timelineOffsetPercents[1];
      }

      for (const screenshot of focusedSession.timeline.screenshots) {
        screenshotCache.process(focusedSession.id, screenshot);
      }
    },
  },

  mounted() {
    Client.on('PageState.updated', this.onPageStateUpdatedEvent);
    Client.send('PageState.load', {
      pageStateId: this.pageStateId,
    });
  },

  beforeUnmount() {
    Client.off('PageState.updated', this.onPageStateUpdatedEvent);
  },
});
</script>

<style lang="scss">
@import '../../../assets/style/resets.scss';

#FocusedTimelinePage {
  #chrome-alive-bar {
    padding-top: 2px;
    padding-bottom: 2px;
    background-color: #ffffff;
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
    -webkit-app-region: no-drag;
    height: 40px;
    vertical-align: top;
  }

  #timeline-bar {
    flex: 1;
    display: flex;
    flex-direction: row;
    .session-preview {
      padding: 10px 20px;

      .times {
        text-align: center;
        font-size: 14px;
      }
    }

    .change-state-select {
      padding: 2px 5px;
      margin: 5px 20px;
      border-color: #eee;
      color: #595959;
      vertical-align: text-top;
    }

    .timeline {
      padding: 0;
      .bar {
        padding-top: 0;
        padding-left: 17px;
        padding-right: 17px;
        .track {
          top: 14px;
          position: relative;
        }
        .tick.default .marker {
          width: 1px;
        }
        .tick.domcontentloaded .marker,
        .tick.allcontentloaded .marker {
          height: 8px;
          width: 8px;
          background-color: #1d8ce0;
          border: 0 none;
          border-radius: 15px;
          overflow: hidden;
          top: 16.5px;
          left: -4px;
          opacity: 0.7;
          margin: 0 auto;
          box-sizing: border-box;
          z-index: 1;
        }
        .tick.allcontentloaded .marker {
          background-color: #318f62;
        }
      }

      #drag-range {
        top: -12px;
        height: 33px;
        border: 7px solid #f1a33a;
        box-shadow: 1px 1px 2px #000, inset 1px 1px 2px #000;
        position: absolute;
        box-sizing: border-box;
        border-radius: 14px;
        overflow: hidden;
        min-width: 41px;
        z-index: 2;

        #dragLeft,
        #dragRight {
          cursor: ew-resize;
          position: absolute;
          top: 0;
          width: 10px;
          background: #f1a33a;
          height: 100%;

          &:active {
            cursor: ew-resize;
          }
          &.focused {
            opacity: 0.85;
          }
        }
        #dragLeft {
          left: 0;
        }
        #dragRight {
          right: 0;
        }
      }
    }

    #extend-session {
      font-size: 0.9em;
      color: #2d2d2d;
      vertical-align: middle;
      padding: 10px 20px;
      display: block;

      &.loading {
        opacity: 0.6;
        cursor: not-allowed;
        background-image: url('~@/assets/icons/loading-bars.svg');
        background-position: center right;
        background-repeat: no-repeat;
        background-size: 10px;
      }
    }
  }
}
.dragging {
  .timeline:hover {
    cursor: ew-resize;
  }
}
</style>
