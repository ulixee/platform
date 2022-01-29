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

    <Menu
      @navigated="showMenu = false"
      :style="{ left: menuOffsetLeft + 'px' }"
      :show="showMenu && !showTimelineHover"
      :toolbarRect="() => toolbarRect"
      :session="session"
    ></Menu>
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
import Menu from '@/components/Menu.vue';
import { LoadStatus } from '@ulixee/hero-interfaces/Location';

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
    domStates: [],
    hasWarning: false,
    scriptEntrypoint: '',
    scriptLastModifiedTime: 0,
  };
}

export default Vue.defineComponent({
  name: 'Live',
  components: { Timeline, TimelineHover, TimelineHandle, Menu },
  setup() {
    let timeAgoTimeout: number;
    let toolbarDiv = Vue.ref<HTMLDivElement>();

    return {
      scriptTimeAgo: Vue.ref(''),
      timeAgoTimeout,
      timeAgoDelay: 1e3,

      toolbarDiv,

      timetravelTimeout: -1,
      lastTimetravelTimestamp: -1,
      isTimetravelMode: Vue.ref(false),
      isRunning: Vue.ref(false),
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

      focusedDomState: Vue.reactive({} as { offset: number; id: string; window: Window }),
    };
  },
  emits: ['open-generator'],
  computed: {
    toolbarRect() {
      return this.toolbarDiv?.getBoundingClientRect();
    },
  },
  async created() {
    await Client.connect();
  },

  methods: {
    toggleMenu() {
      this.menuOffsetLeft = this.menuButton.getBoundingClientRect().left;
      this.showMenu = !this.showMenu;
    },

    showDomStatePopup(tick: ITimelineTick) {
      const width = 400;
      const height = 150;
      const { bottom } = this.timelineRef.getTrackBoundingRect();
      const offset = this.timelineRef.getPageXByOffsetPercent(tick?.offsetPercent ?? 100);
      this.focusedDomState.offset = offset;
      const left = window.screenLeft + offset - width + 80;
      const top = window.screenTop + bottom + 4;

      const domStateId = tick.id as string;

      const domState = {
        message: this.domStateMessage(domStateId),
        isResolving: this.domStateIsResolving(domStateId),
      };

      if (this.focusedDomState.window) {
        if (tick?.id !== this.focusedDomState.id) {
          return;
        }
        const childWindow = this.focusedDomState.window;
        if (childWindow.screenTop !== top || childWindow.screenLeft !== left) {
          childWindow.moveTo(left, top);
        }
        if ('onDomStateUpdated' in childWindow) {
          (childWindow as any).onDomStateUpdated(domState);
        } else {
          (childWindow as any).domState = domState;
        }
        return;
      }

      this.showTimelineHover = false;
      this.focusedDomState.id = domStateId;
      const features = `top=${top},left=${left},width=${width},height=${height}`;
      this.focusedDomState.window = window.open(
        '/domstate-popup.html',
        'DomStatePopup',
        features,
      );
      (this.focusedDomState.window as any).domState = domState;
      (this.focusedDomState.window as any).openDomState = this.openDomState.bind(
        this,
        tick?.id as string,
      );
      this.focusedDomState.window.addEventListener('close', () => {
        this.focusedDomState.window = null;
      });
      this.focusedDomState.window.addEventListener('manual-close', () => {
        this.focusedDomState.window = null;
      });
    },

    closeDomStatePopup() {
      if (this.focusedDomState.window) {
        try {
          this.focusedDomState.window.close();
        } catch (err) {}
        this.focusedDomState.window = null;
      }
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
      let domStateTick: ITimelineTick;
      if (
        hoverEvent.closestTickAbove?.class === 'domstate' &&
        hoverEvent.closestTickAbove.offsetPercent - hoverEvent.offset < 2
      )
        domStateTick = hoverEvent.closestTickAbove;
      else if (
        hoverEvent.closestTickBelow?.class === 'domstate' &&
        hoverEvent.offset - hoverEvent.closestTickBelow.offsetPercent < 2
      )
        domStateTick = hoverEvent.closestTickBelow;

      if (domStateTick && !this.isTimetravelMode) {
        this.showDomStatePopup(domStateTick);
        return;
      }

      this.closeDomStatePopup();

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
      this.doTimetravel().catch(console.error);
    },

    timetravelDragstart(): void {
      this.isDragging = true;
      this.closeDomStatePopup();
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

      if (Date.now() - this.lastTimetravelTimestamp < 250) {
        if (this.timetravelTimeout) return;
        this.timetravelTimeout = setTimeout(this.doTimetravel, 100) as any;
        return;
      }
      const percentOffset = this.pendingTimetravelOffset;
      this.clearPendingTimetravel();
      await Client.send('Session.timetravel', {
        heroSessionId: this.session.heroSessionId,
        percentOffset,
      });
    },

    clearPendingTimetravel() {
      clearTimeout(this.timetravelTimeout);
      this.timetravelTimeout = null;
      this.pendingTimetravelOffset = null;
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

    domStateMessage(domStateId?: string): string {
      const domState =
        this.session.domStates.find(x => x.id === domStateId) ??
        this.session.domStates[this.session.domStates.length - 1];
      return `Dom State: ${domState.name}`;
    },

    domStateIsResolving(domStateId?: string): boolean {
      const domState =
        this.session.domStates.find(x => x.id === domStateId) ??
        this.session.domStates[this.session.domStates.length - 1];
      return !domState.inProgress;
    },

    openDomState(domStateId?: string) {
      domStateId ??= this.session.domStates[this.session.domStates.length - 1].id;
      this.$emit('open-generator', domStateId);
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
          class: url.offsetPercent === 100 ? 'url': 'urlrequest',
        });
        for (const status of url.loadStatusOffsets) {
          if (status.loadStatus === LoadStatus.HttpResponded) {
            timelineTicks.push({
              id: url.navigationId,
              offsetPercent: status.offsetPercent,
              class: 'url',
            });
          }
        }
      }

      for (const domState of message.domStates) {
        if (domState.offsetPercent < 0) continue;
        const match = timelineTicks.findIndex(x => x.offsetPercent === domState.offsetPercent);
        // delete other ticks at this location
        if (match >= 0) timelineTicks.splice(match, 1);
        const tick: ITimelineTick = {
          id: domState.id,
          offsetPercent: domState.offsetPercent,
          class: 'domstate',
        };
        timelineTicks.push(tick);
      }
      timelineTicks.sort((a, b) => a.offsetPercent - b.offsetPercent);
      this.timelineTicks = timelineTicks;

      this.isRunning = this.session.playbackState === 'running';
      this.timelineUrlIndex =
        this.startLocation === 'sessionStart' ? 0 : message.timeline.urls.length - 1;

      this.onAppModeEvent({ mode: message.mode });

      if (isNewId || !this.isTimetravelMode) {
        this.timelineOffset = 100;
        this.showTimelineHover = false;
        if (!message.heroSessionId) this.closeDomStatePopup();
      }

      this.updateScriptTimeAgo();
    },

    onAppModeEvent(message: IAppModeEvent): void {
      this.isTimetravelMode = message.mode === 'timetravel';
      if (this.isTimetravelMode) {
        this.closeDomStatePopup();
      } else if (message.mode === 'live') {
        this.timelineOffset = 100;
        this.clearPendingTimetravel();
      }
    },

    hideMenu() {
      this.showMenu = false;
    },
  },

  mounted() {
    Client.on('Session.active', this.onSessionActiveEvent);
    Client.on('App.mode', this.onAppModeEvent);
    window.addEventListener('blur', this.hideMenu);
    document.addEventListener('keyup', this.onKeypress);
  },

  beforeUnmount() {
    clearTimeout(this.timeAgoTimeout);
    Client.off('Session.active', this.onSessionActiveEvent);
    Client.off('App.mode', this.onAppModeEvent);
    window.removeEventListener('blur', this.hideMenu);
    document.removeEventListener('keyup', this.onKeypress);
    this.closeDomStatePopup();
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

  .timeline {
    .bar .tick.domstate .marker {
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
      background-image: url('~@/assets/icons/domstate.svg');
      backface-visibility: hidden;
      background-size: contain;
      background-repeat: no-repeat;
    }
    .bar .tick.urlrequest .marker {
      width: 12px;
      height: 12px;
      left: -7px;
      top: 15px;
      opacity: 0.9;
      z-index: 2;
      border: 0 none;
      display: inline-block;
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      background-size: contain;
      background-repeat: no-repeat;
      background-image: url('~@/assets/icons/navigate.svg');
      background-color: transparent;
    }

    &:hover {
      .bar .tick.domstate .marker {
        z-index: 0;
        opacity: 0.1;
      }
    }
  }
}
</style>
