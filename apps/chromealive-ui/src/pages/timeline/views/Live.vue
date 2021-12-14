<template>
  <div id="LivePage">
    <div id="chrome-alive-bar" ref="toolbarDiv">
      <div id="script">
        <div id="entrypoint">
          Chrome is {{ isTimetravelMode ? 'time traveling' : 'bound to' }}
          <i>{{ session.scriptEntrypoint }}</i>
        </div>
      </div>

      <Timeline
        @hover="onTimelineHover"
        @mouseout="onTimelineMouseout"
        @click="onTimelineClick"
        :active-tick-index="timelineUrlIndex"
        :hero-session-id="session.heroSessionId"
        :timeline="session.timeline"
        :ticks="timelineTicks"
        ref="timelineRef"
      >
        <TimelineHandle
          id="nib"
          :isDraggable="!isRunning"
          :style="{ left: timelineOffset + '%' }"
          @dragstart="timetravelDragstart"
          @dragend="timetravelDragend"
          @drag="timetravelDrag"
        ></TimelineHandle>
      </Timeline>

      <div id="script-updated">(script updated {{ scriptTimeAgo }} ago)</div>

      <div id="buttons-panel">
        <slot v-if="isTimetravelMode">
          <button @click.prevent="historyBack" id="history-back-button" class="app-button">
            <span class="label">Step Back</span>
            <div class="icon"></div>
          </button>
          <button @click.prevent="historyForward" id="history-forward-button" class="app-button">
            <span class="label">Step Forward</span>
            <div class="icon"></div>
          </button>
        </slot>
        <slot v-else>
          <button
            v-if="!isTimetravelMode && !isRunning"
            @click.prevent="resume"
            id="play-button"
            class="app-button"
            :disabled="!canPlay()"
          >
            <span class="label">Start</span>
            <div class="icon"></div>
          </button>
          <button
            v-else-if="!isTimetravelMode"
            @click.prevent="pause"
            id="pause-button"
            class="app-button"
            :disabled="!canPause()"
          >
            <span class="label">Stop</span>
            <div class="icon"></div>
          </button>
        </slot>
      </div>
    </div>

    <TimelineHover
      :style="{ display: showTimelineHover ? 'flex' : 'none' }"
      :runtimeMs="session.runtimeMs"
      :hoverEvent="timelineHover"
    ></TimelineHover>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import IAppModeEvent from '@ulixee/apps-chromealive-interfaces/events/IAppModeEvent';
import Timeline, { ITimelineHoverEvent, ITimelineTick } from '@/components/Timeline.vue';
import TimelineHandle from '@/components/TimelineHandle.vue';
import TimelineHover from '@/components/TimelineHover.vue';

type IStartLocation = 'currentLocation' | 'sessionStart';

function createDefaultSession(): IHeroSessionActiveEvent {
  return {
    timeline: { urls: [], paintEvents: [], screenshots: [], storageEvents: [] },
    playbackState: 'paused',
    mode: 'live',
    runtimeMs: 0,
    worldHeroSessionIds: [],
    heroSessionId: '',
    run: 0,
    pageStateIdNeedsResolution: null,
    pageStates: [],
    hasWarning: false,
    scriptEntrypoint: '',
    scriptLastModifiedTime: 0,
  };
}

export default Vue.defineComponent({
  name: 'Live',
  components: { Timeline, TimelineHover, TimelineHandle },
  setup() {
    let timeAgoTimeout: number;
    let toolbarDiv = Vue.ref<HTMLDivElement>();

    return {
      scriptTimeAgo: Vue.ref(''),
      timeAgoTimeout,
      timeAgoDelay: 1e3,

      toolbarDiv,

      isTimetravelMode: Vue.ref(false),
      isRunning: Vue.ref(false),
      startLocation: Vue.ref<IStartLocation>('currentLocation'),
      session: Vue.reactive(createDefaultSession()),

      pendingTimetravelOffset: null as number,
      timelineUrlIndex: Vue.ref<Number>(null),
      timelineOffset: Vue.ref(100),
      timelineRef: Vue.ref<typeof Timeline>(),
      timelineHover: Vue.reactive<ITimelineHoverEvent>({} as any),
      timelineTicks: Vue.reactive<ITimelineTick[]>([]),
      showTimelineHover: Vue.ref(false),
      isDragging: Vue.ref(false),
    };
  },
  emits: ['open-generator'],
  computed: {
    toolbarRect() {
      return this.toolbarDiv?.getBoundingClientRect();
    },
  },
  methods: {
    calculateScriptTimeAgo(): string {
      const lastModifiedTime = this.session.scriptLastModifiedTime;
      if (!lastModifiedTime) return 'long';
      const timeAgo = Date.now() - lastModifiedTime;
      const oneMinute = 60e3;
      const oneHour = oneMinute * 60;
      const oneDay = oneHour * 24;
      if (timeAgo >= oneDay) {
        const days = Math.floor(timeAgo / oneDay);
        this.timeAgoDelay = 60e3;
        if (days > 1) return `${days} days`;
        return `1 day`;
      }
      if (timeAgo >= oneHour) {
        const hours = Math.floor(timeAgo / oneHour);
        this.timeAgoDelay = 60e3;
        return `${hours}h`;
      }
      if (timeAgo >= oneMinute) {
        const minutes = Math.floor(timeAgo / oneMinute);
        this.timeAgoDelay = 30e3;
        return `${minutes}m`;
      }
      this.timeAgoDelay = 1e3;
      const seconds = Math.floor(timeAgo / 1e3);
      return `${seconds}s`;
    },

    onTimelineHover(hoverEvent: ITimelineHoverEvent): void {
      let pageStateTick: ITimelineTick;
      if (
        hoverEvent.closestTickAbove?.class === 'pagestate' &&
        hoverEvent.closestTickAbove.offsetPercent - hoverEvent.offset < 2
      )
        pageStateTick = hoverEvent.closestTickAbove;
      else if (
        hoverEvent.closestTickBelow?.class === 'pagestate' &&
        hoverEvent.offset - hoverEvent.closestTickBelow.offsetPercent < 2
      )
        pageStateTick = hoverEvent.closestTickBelow;
      const stats = this.timelineRef.getTimelineStats(hoverEvent.offset);
      Object.assign(this.timelineHover, hoverEvent, stats);
      this.showTimelineHover = true;
    },

    onTimelineMouseout(): void {
      this.showTimelineHover = false;
    },

    onTimelineClick(event: MouseEvent, tick: ITimelineTick): void {
      this.timetravelDrag(event);
      this.doTimetravel();
    },

    timetravelDrag(event: MouseEvent): void {
      const value = this.timelineRef.getTrackOffset(event);

      this.isTimetravelMode = value < 100;
      if (this.session.heroSessionId && value !== this.timelineOffset) {
        this.pendingTimetravelOffset = value;
      }
      this.timelineOffset = value;
    },

    timetravelDragstart(): void {
      this.isDragging = true;
    },

    timetravelDragend(): void {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.doTimetravel().catch(console.error);
    },

    onKeypress(event: KeyboardEvent): void {
      // let this trigger history mode
      if (event.code === 'ArrowLeft') {
        this.historyBack();
      }
      if (event.code === 'ArrowRight' && this.isTimetravelMode) {
        this.historyForward();
      }
    },

    async historyForward() {
      const { timelineOffsetPercent } = await Client.send('Session.timetravel', {
        heroSessionId: this.session.heroSessionId,
        step: 'forward',
      });
      this.timelineOffset = timelineOffsetPercent;
      if (timelineOffsetPercent === 100) this.isTimetravelMode = false;
    },

    async historyBack() {
      if (!this.isTimetravelMode) return;
      const { timelineOffsetPercent } = await Client.send('Session.timetravel', {
        heroSessionId: this.session.heroSessionId,
        step: 'back',
      });
      this.timelineOffset = timelineOffsetPercent;
    },

    async doTimetravel() {
      if (this.pendingTimetravelOffset === null) return;
      const percentOffset = this.pendingTimetravelOffset;
      this.pendingTimetravelOffset = null;
      await Client.send('Session.timetravel', {
        heroSessionId: this.session.heroSessionId,
        percentOffset,
      });
    },

    canPlay(): boolean {
      if (!this.session.heroSessionId) return false;
      return this.session.playbackState === 'paused';
    },

    canPause(): boolean {
      if (!this.session.heroSessionId) return false;
      return this.isRunning;
    },

    resume() {
      Client.send('Session.resume', {
        heroSessionId: this.session.heroSessionId,
        startLocation: this.startLocation,
      });
    },

    pause() {
      Client.send('Session.step', { heroSessionId: this.session.heroSessionId });
    },

    pageStateMessage(pageStateId?: string): string {
      const pageState =
        this.session.pageStates.find(x => x.id === pageStateId) ??
        this.session.pageStates[this.session.pageStates.length - 1];
      return pageState.isUnresolved
        ? 'New Page State Found'
        : `Page State: ${pageState.resolvedState ?? '...'}`;
    },

    pageStateIsResolving(pageStateId?: string): boolean {
      const pageState =
        this.session.pageStates.find(x => x.id === pageStateId) ??
        this.session.pageStates[this.session.pageStates.length - 1];
      return !pageState.isUnresolved && !pageState.resolvedState;
    },

    openCircuitPanel(pageStateId?: string) {
      pageStateId ??= this.session.pageStates[this.session.pageStates.length - 1].id;
      this.$emit('open-generator', pageStateId);
    },

    updateScriptTimeAgo(): void {
      this.scriptTimeAgo = this.calculateScriptTimeAgo();
      clearTimeout(this.timeAgoTimeout);
      this.timeAgoTimeout = setTimeout(this.updateScriptTimeAgo, this.timeAgoDelay ?? 1e3) as any;
    },

    onSessionActiveEvent(message: IHeroSessionActiveEvent) {
      message ??= createDefaultSession();
      const isNewId =
        message.heroSessionId !== this.session.heroSessionId || !message.heroSessionId;
      Object.assign(this.session, message);

      const timelineTicks: ITimelineTick[] = [];
      for (const url of message.timeline.urls) {
        if (url.offsetPercent < 0) continue;
        timelineTicks.push({
          id: url.navigationId,
          offsetPercent: url.offsetPercent,
          class: 'url',
        });
      }

      for (const pageState of message.pageStates) {
        if (pageState.offsetPercent < 0) continue;
        const match = timelineTicks.findIndex(x => x.offsetPercent === pageState.offsetPercent);
        // delete other ticks at this location
        if (match >= 0) timelineTicks.splice(match, 1);
        const tick: ITimelineTick = {
          id: pageState.id,
          offsetPercent: pageState.offsetPercent,
          class: 'pagestate',
        };
        timelineTicks.push(tick);
      }
      timelineTicks.sort((a, b) => a.offsetPercent - b.offsetPercent);
      this.timelineTicks = timelineTicks;

      this.isRunning = this.session.playbackState === 'running';
      this.timelineUrlIndex = this.startLocation === 'sessionStart' ? 0 : message.timeline.urls.length - 1;

      this.onAppModeEvent({ mode: message.mode });

      if (isNewId || !this.isTimetravelMode) {
        this.timelineOffset = 100;
        this.showTimelineHover = false;
      }

      this.updateScriptTimeAgo();
    },

    onAppModeEvent(message: IAppModeEvent): void {
      this.isTimetravelMode = message.mode === 'timetravel';
    },
  },

  async created() {
    await Client.connect();
  },

  mounted() {
    Client.on('Session.active', this.onSessionActiveEvent);
    Client.on('App.mode', this.onAppModeEvent);
    document.addEventListener('keyup', this.onKeypress);
  },

  beforeUnmount() {
    clearTimeout(this.timeAgoTimeout);
    Client.off('Session.active', this.onSessionActiveEvent);
    Client.off('App.mode', this.onAppModeEvent);
    document.removeEventListener('keyup', this.onKeypress);
  },
});
</script>

<style lang="scss">
@import '../../../assets/style/resets.scss';

:root {
  --toolbarBackgroundColor: #fffdf4;

  --buttonActiveBackgroundColor: rgba(176, 173, 173, 0.4);
  --buttonHoverBackgroundColor: rgba(255, 255, 255, 0.08);
}

#LivePage {
  #chrome-alive-bar {
    padding-top: 2px;
    padding-bottom: 2px;
    background-color: white;
    display: flex;
    align-items: center;
    margin: 0 auto;
    vertical-align: center;
    justify-content: center;
    -webkit-app-region: no-drag;
    height: 40px;
  }

  #script {
    display: flex;
    flex-direction: row;
    line-height: 30px;
    min-width: 200px;

    #entrypoint {
      overflow: hidden;
      white-space: nowrap;
      text-align: right;
      text-overflow: ellipsis;
      direction: rtl;
      margin-left: 16px;
      color: rgba(0,0,0,0.8);
    }

    .app-button {
      border: 0 none;
      padding: 0;
      margin-left: 10px;
    }
  }

  #script-updated {
    margin: 0 5px;
    white-space: nowrap;
    min-width: 175px;
    text-align: center;
  }

  #history-back-button .label,
  #history-forward-button .label,
  #play-button .label,
  #pause-button .label {
    display: none;
  }

  #buttons-panel {
    width: 50px;
  }

  .app-button {
    &:disabled {
      background-color: var(--buttonActiveBackgroundColor);
    }

    &:active,
    &.selected {
      background-color: var(--buttonActiveBackgroundColor) !important;
    }

    &:hover {
      background-color: var(--buttonHoverBackgroundColor);
    }

    &#history-forward-button,
    &#history-back-button {
      padding: 2px 1px;
      margin: 2px 1px;
      .icon {
        width: 16px;
        height: 16px;
      }
    }
  }

  #nib.handle {
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

    &.disabled {
      opacity: 0.4;
    }
  }

  #play-button .icon {
    background-image: url('~@/assets/icons/play.svg');
  }

  #pause-button .icon {
    background-image: url('~@/assets/icons/pause.svg');
  }

  #history-back-button .icon {
    background-image: url('~@/assets/icons/arrow-left.svg');
  }

  #history-forward-button .icon {
    background-image: url('~@/assets/icons/arrow-right.svg');
  }
}
</style>
