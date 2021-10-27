<template>
  <div id="LivePage">
    <div id="chrome-alive-bar" ref="toolbarDiv">
      <div id="script">
        <button @click.prevent="toggleMenu()" id="menu-button" class="app-button" ref="menuButton">
          <span class="label">Menu</span>
          <div class="icon"></div>
        </button>
        <div id="entrypoint">
          ChromeAlive {{ isTimetravelMode ? 'in Timetravel Mode for' : 'bound to' }}
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
          :isDraggable="!isLive"
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
            v-if="!isTimetravelMode && !isLive"
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

    <Menu
      @navigated="showMenu = false"
      :style="{ left: menuOffsetLeft + 'px' }"
      :show="showMenu && !showTimelineHover"
      :toolbarRect="() => toolbarRect"
      :session="session"
    ></Menu>

    <div
      id="pagestate-popup"
      :style="{
        left: focusedPageState.offset - 320 + 'px',
        display: showPageStatePopup ? 'block' : 'none',
      }"
    >
      <img :src="ICON_CARET" class="caret" />
      <div class="wrapper">
        <h5>New Page State Found</h5>

        <button @click.prevent="openPageState()">Open Generator</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import Timeline, { ITimelineHoverEvent, ITimelineTick } from '@/components/Timeline.vue';
import TimelineHandle from '@/components/TimelineHandle.vue';
import TimelineHover from '@/components/TimelineHover.vue';
import Menu from '@/components/Menu.vue';

const ICON_CARET = require('@/assets/icons/caret.svg');
type IStartLocation = 'currentLocation' | 'sessionStart';

function createDefaultSession(): IHeroSessionActiveEvent {
  return {
    timeline: { urls: [], paintEvents: [], screenshots: [] },
    playbackState: 'paused',
    runtimeMs: 0,
    heroSessionId: '',
    run: 0,
    needsPageStateResolution: false,
    pageStates: [],
    hasWarning: false,
    scriptEntrypoint: '',
    scriptLastModifiedTime: 0,
  };
}

export default Vue.defineComponent({
  name: 'Live',
  components: { Timeline, TimelineHover, TimelineHandle, Menu },
  setup(props, ctx) {
    let timeAgoTimeout: number;
    let toolbarDiv = Vue.ref<HTMLDivElement>();
    let boundsMonitor = new ResizeObserver(ev => {
      if (!ev.length) return;
      ctx.emit('bounds-changed', ev[0].target);
    });

    return {
      scriptTimeAgo: Vue.ref(''),
      timeAgoTimeout,
      timeAgoDelay: 1e3,

      toolbarDiv,
      boundsMonitor,

      isTimetravelMode: Vue.ref(false),
      isLive: Vue.ref(false),
      startLocation: Vue.ref<IStartLocation>('currentLocation'),
      session: Vue.reactive(createDefaultSession()),

      showMenu: Vue.ref(false),
      menuOffsetLeft: Vue.ref(0),
      menuButton: Vue.ref<HTMLButtonElement>(),

      pendingTimetravelOffset: null as number,
      timelineUrlIndex: Vue.ref<Number>(null),
      timelineOffset: Vue.ref(100),
      timelineRef: Vue.ref<typeof Timeline>(),
      timelineHover: Vue.reactive<ITimelineHoverEvent>({} as any),
      timelineTicks: Vue.reactive<ITimelineTick[]>([]),
      showTimelineHover: Vue.ref(false),
      isDragging: Vue.ref(false),

      ICON_CARET,
      focusedPageState: Vue.reactive({} as { offset: number; id: string; show: boolean }),
    };
  },
  emits: ['bounds-changed', 'open-generator'],
  computed: {
    showPageStatePopup(): boolean {
      if (this.showMenu || this.showTimelineHover) return false;
      return this.focusedPageState.show;
    },
    toolbarRect() {
      return this.toolbarDiv?.getBoundingClientRect();
    },
  },
  methods: {
    toggleMenu() {
      this.menuOffsetLeft = this.menuButton.getBoundingClientRect().left;
      this.showMenu = !this.showMenu;
    },

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
      if (hoverEvent.closestTick?.class === 'pagestate') {
        this.showPageState(hoverEvent.closestTick);
        return;
      }
      Object.assign(this.timelineHover, hoverEvent);
      this.showTimelineHover = true;
    },

    onTimelineMouseout(): void {
      this.showTimelineHover = false;
      this.focusedPageState = {
        show: false,
        offset: this.timelineRef.getTrackOffsetPercent(100),
        id: null,
      };
    },

    onTimelineClick(event: MouseEvent, tick: ITimelineTick): void {
      if (tick.class === 'pagestate') {
        this.showPageState(tick);
        return;
      }
      this.timetravelDrag(event);
      this.doTimetravel();
    },

    showPageState(tick: ITimelineTick): void {
      this.showTimelineHover = false;
      this.focusedPageState.show = true;
      this.focusedPageState.id = tick.id as string;
      this.focusedPageState.offset = this.timelineRef.getTrackOffsetPercent(tick.offsetPercent);
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
      return this.isLive;
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

    openPageState(pageStateId?: string) {
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
        timelineTicks.push({
          id: url.navigationId,
          offsetPercent: url.offsetPercent,
          class: 'url',
        });
      }

      for (const ps of message.pageStates) {
        const match = timelineTicks.findIndex(x => x.offsetPercent === ps.offsetPercent);
        if (match >= 0) timelineTicks.splice(match, 1);
        timelineTicks.push({
          id: ps.id,
          offsetPercent: ps.offsetPercent,
          class: 'pagestate',
        });
      }
      timelineTicks.sort((a, b) => a.offsetPercent - b.offsetPercent);
      this.timelineTicks = timelineTicks;

      if (message.needsPageStateResolution) {
        this.focusedPageState.offset = this.timelineRef.getTrackOffsetPercent(100);
      }
      this.focusedPageState.show = message.needsPageStateResolution;

      this.isTimetravelMode = this.session.playbackState === 'timetravel';
      this.isLive = this.session.playbackState === 'live';
      this.timelineUrlIndex =
        this.startLocation === 'sessionStart' ? 0 : message.timeline.urls.length - 1;

      if (isNewId || !this.isTimetravelMode) {
        this.timelineOffset = 100;
        this.showTimelineHover = false;
      }

      this.updateScriptTimeAgo();
    },

    hideMenu() {
      this.showMenu = false;
    },
  },

  async created() {
    await Client.connect();
  },

  mounted() {
    Client.on('Session.active', this.onSessionActiveEvent);
    window.addEventListener('blur', this.hideMenu);
    document.addEventListener('keyup', this.onKeypress);
    this.boundsMonitor.observe(this.toolbarDiv);
    this.$emit('bounds-changed', this.toolbarDiv);
  },

  beforeUnmount() {
    clearTimeout(this.timeAgoTimeout);
    Client.off('Session.active', this.onSessionActiveEvent);
    window.removeEventListener('blur', this.hideMenu);
    document.removeEventListener('keyup', this.onKeypress);
    this.boundsMonitor.unobserve(this.toolbarDiv);
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
    background-color: var(--toolbarBackgroundColor);
    box-shadow: 0 0 1px rgba(0, 0, 0, 0.12), 0 1px 1px rgba(0, 0, 0, 0.16);
    border: 1px solid rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    margin: 0 auto;
    vertical-align: center;
    justify-content: center;
    -webkit-app-region: no-drag;
    transition: opacity 20ms ease-in;
    height: 32px;
  }

  #script {
    flex: 2;
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

  #pagestate-popup {
    flex: auto;
    flex-direction: column;
    box-sizing: border-box;
    padding: 2px 3px;
    width: 400px;
    height: 150px;
    position: relative;
    z-index: 3;
    top: -2px;
    background: #f5faff;
    border-radius: 5px;
    border: 1px solid #eaeef3;
    box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.3);
    transition: opacity 0.3s, transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);

    .caret {
      position: absolute;
      box-sizing: border-box;
      top: -16px;
      right: 70px;
      width: 20px;
      height: 20px;
      filter: drop-shadow(-1px -1px 2px rgba(0, 0, 0, 0.3));
      pointer-events: none;
    }

    h5 {
      font-size: 23px;
      text-align: center;
      text-transform: uppercase;
      margin-top: 20px;
    }

    button {
      line-height: 25px;
      display: block;
      float: right;
      margin-right: 50px;
    }
  }

  &.showingPageStatePopup {
    #pagestate-popup {
      display: block;
    }
  }

  #history-back-button .label,
  #history-forward-button .label,
  #menu-button .label,
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

  &:hover {
    #menu-button {
      border-color: transparent;
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

  #menu-button .icon {
    background-image: url('~@/assets/icons/menu-logo.svg');
    width: 30px;
    height: 18px;
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

  #timeline #bar .tick.pagestate .marker {
    width: 20px;
    height: 20px;
    left: -11px;
    top: 10px;
    opacity: 0.9;
    border-radius: 2px;
    z-index: 2;
    border: 0 none;
    box-shadow: -1px 1px 2px rgba(0, 0, 0, 0.6);
    display: inline-block;
    background-image: url('~@/assets/icons/pagestate.svg');
    backface-visibility: hidden;
    background-size: contain;
    background-repeat: no-repeat;
  }
}
</style>
