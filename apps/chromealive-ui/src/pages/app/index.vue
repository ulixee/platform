<template>
  <div
    id="ChromeAlivePage"
    :class="{
      showingScreenshot: timelineHover.show,
      showingMenu: isShowingMenu,
      dragging: isDragging,
    }"
    ref="appDiv"
  >
    <div id="chrome-alive-bar" ref="toolbarDiv" :class="{ loading: isLoading }">
      <div id="script">
        <button @click.prevent="toggleMenu()" id="menu-button" class="app-button" ref="menuButton">
          <span class="label">Menu</span>
          <div class="icon"></div>
        </button>
        <div id="entrypoint">
          ChromeAlive {{ isHistoryMode ? 'in History Mode for' : 'bound to' }}
          <i>{{ session.scriptEntrypoint }}</i>
        </div>
      </div>

      <Timeline
        @hover="onTimelineHover"
        @update:value="onTimelineChange"
        @mouseout="onTimelineMouseout"
        @click="timeTravel"
        @dragstart="timetravelDragstart"
        @dragend="timetravelDragend"
        :active-url-index="timelineUrlIndex"
        :value="timelineOffset"
        :is-live="isLive"
        :is-history-mode="isHistoryMode"
        :hero-session-id="session.heroSessionId"
        :timeline="session.timeline"
      ></Timeline>

      <div id="script-updated">(script updated {{ scriptTimeAgo }} ago)</div>

      <div id="buttons-panel">
        <slot v-if="isHistoryMode">
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
            v-if="!isHistoryMode && !isLive"
            @click.prevent="resume"
            id="play-button"
            class="app-button"
            :disabled="!canPlay()"
          >
            <span class="label">Start</span>
            <div class="icon"></div>
          </button>
          <button
            v-else-if="!isHistoryMode"
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

    <div id="timeline-hover" :style="{ left: timelineHover.left + 'px' }" ref="timelineHoverDiv">
      <img :src="ICON_CARET" class="caret" />
      <div class="url">{{ timelineHover.url || '...' }}</div>
      <div class="changes">
        {{ timelineHover.runtime }}; {{ timelineHover.domChanges }} dom changes
      </div>
      <div class="screenshot">
        <img
          v-if="timelineHover.imageBase64"
          :src="`data:image/jpg;base64,${timelineHover.imageBase64}`"
        />
        <div class="status" v-if="timelineHover.status">{{ timelineHover.status }}</div>
      </div>
    </div>

    <div id="bar-menu" v-if="isShowingMenu" :style="{ left: menuOffset.left + 'px' }">
      <div class="wrapper">
        <ul class="menu-items">
          <li class="databox-toggle" @click.prevent="toggleDatabox()">
            {{ databoxWindow !== null ? 'Hide' : 'Show' }} Databox Panel
          </li>
          <li class="rerun-script" @click.prevent="resumeFrom('sessionStart')">
            Rerun script from beginning
          </li>
          <li class="quit-script" @click.prevent="quitScript()">Shutdown Chrome + Script</li>
          <li class="divider"></li>
          <li class="about" @click.prevent="showAbout()">About ChromeAlive!</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import { IBounds } from '@ulixee/apps-chromealive-interfaces/IBounds';
import Timeline, { ITimelineHoverEvent } from '@/components/Timeline.vue';

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
  name: 'App',
  components: { Timeline },
  setup() {
    let scriptTimeAgo = Vue.ref('');
    let timeAgoTimeout: number;
    let timeAgoDelay = 1e3;
    let lastToolbarBounds: IBounds;
    let databoxWindow: Window = Vue.ref(null);
    let hasLaunchedDatabox = false;
    let isLoading = Vue.ref(false);
    let isShowingMenu = Vue.ref(false);
    let isHistoryMode = Vue.ref(false);
    let isLive = Vue.ref(false);
    let appDiv = Vue.ref<HTMLDivElement>();
    let timelineHoverWidth: number;
    let timelineUrlIndex = Vue.ref<Number>(null);
    let timelineHoverDiv = Vue.ref<HTMLDivElement>();
    let timelineOffset = Vue.ref<Number>(100);
    let timelineRef = Vue.ref<typeof Timeline>(null);
    let menuButton = Vue.ref<HTMLButtonElement>();
    let toolbarDiv = Vue.ref<HTMLDivElement>();
    let startLocation = Vue.ref<IStartLocation>('currentLocation');
    let pendingTimetravelOffset: number = null;
    let isDragging = Vue.ref(false);

    let session = Vue.reactive(createDefaultSession());

    let timelineHover = Vue.reactive({
      left: 0,
      url: '',
      domChanges: 0,
      runtime: '',
      status: '',
      imageBase64: '',
      show: false,
    });

    let menuOffset = Vue.reactive({
      left: 0,
    });

    return {
      ICON_CARET,
      scriptTimeAgo,
      timeAgoTimeout,
      timeAgoDelay,
      lastToolbarBounds,
      databoxWindow,
      hasLaunchedDatabox,
      isLoading,
      isShowingMenu,
      isHistoryMode,
      startLocation,
      pendingTimetravelOffset,
      session,
      timelineHover,
      timelineHoverWidth,
      menuOffset,
      isLive,
      appDiv,
      toolbarDiv,
      menuButton,
      timelineUrlIndex,
      timelineOffset,
      timelineHoverDiv,
      timelineRef,
      isDragging,
    };
  },
  methods: {
    toggleMenu() {
      this.menuOffset.left = this.menuButton.getBoundingClientRect().left;
      this.isShowingMenu = !this.isShowingMenu;
    },

    quitScript() {
      Client.send('Session.quit', {
        heroSessionId: this.session.heroSessionId,
      });
    },

    showAbout(): void {
      this.isShowingMenu = false;
      console.log(
        'ChromeAlive! is your live interface for controlling Ulixee Databoxes using the Hero web scraper',
      );
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
      const { offset, pageX } = hoverEvent;
      this.timelineHoverWidth ||= this.timelineHoverDiv.getBoundingClientRect().width;
      this.timelineHover.left = pageX - Math.round(this.timelineHoverWidth / 2);

      const runtimeMs = Math.round((offset / 100) * this.session.runtimeMs);
      this.timelineHover.runtime = `${runtimeMs}ms`;
      if (runtimeMs > 1e3) {
        const runtimeSecs = Math.round(10 * (runtimeMs / 1000)) / 10;
        this.timelineHover.runtime = `${runtimeSecs}s`;
      }
      Object.assign(this.timelineHover, hoverEvent);
      this.timelineHover.show = true;
    },

    onTimelineChange(value: number): void {
      this.isHistoryMode = value < 100;
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
      this.timeTravel().catch(console.error);
    },

    onTimelineMouseout(): void {
      this.timelineHover.show = false;
    },

    toggleDatabox() {
      if (this.isShowingMenu) this.isShowingMenu = false;
      if (this.databoxWindow) {
        this.databoxWindow.close();
        this.databoxWindow = null;
      } else {
        const { bottom, right } = this.toolbarDiv.getBoundingClientRect();
        const features = `top=${bottom + 100},left=${right - 260},width=300,height=400`;
        this.databoxWindow = window.open('/databox.html', 'DataboxPanel', features);

        this.databoxWindow.addEventListener('close', () => {
          this.databoxWindow = null;
        });
        this.databoxWindow.addEventListener('manual-close', () => {
          this.databoxWindow = null;
        });
      }
    },

    onKeypress(event: KeyboardEvent): void {
      // let this trigger history mode
      if (event.code === 'ArrowLeft') {
        this.historyBack();
      }
      if (event.code === 'ArrowRight' && this.isHistoryMode) {
        this.historyForward();
      }
    },

    async historyForward() {
      const { timelineOffsetPercent } = await Client.send('Session.timetravel', {
        heroSessionId: this.session.heroSessionId,
        step: 'forward',
      });
      this.timelineOffset = timelineOffsetPercent;
      if (timelineOffsetPercent === 100) this.isHistoryMode = false;
    },

    async historyBack() {
      if (!this.isHistoryMode) return;
      const { timelineOffsetPercent } = await Client.send('Session.timetravel', {
        heroSessionId: this.session.heroSessionId,
        step: 'back',
      });
      this.timelineOffset = timelineOffsetPercent;
    },

    async timeTravel() {
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

    resumeFrom(startLocation: IStartLocation) {
      this.startLocation = startLocation;
      this.resume();
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

      this.isHistoryMode = this.session.playbackState === 'timetravel';
      this.isLive = this.session.playbackState === 'live';
      this.timelineUrlIndex =
        this.startLocation === 'sessionStart' ? 0 : message.timeline.urls.length - 1;

      if (isNewId || !this.isHistoryMode) {
        this.timelineOffset = 100;
        this.timelineHover.show = false;
      }

      this.updateScriptTimeAgo();

      if (!this.hasLaunchedDatabox && !this.databoxWindow) {
        this.hasLaunchedDatabox = true;
        this.toggleDatabox();
      }
    },

    async sendToolbarHeightChange() {
      const toolbar = this.toolbarDiv;
      const bounds = {
        height: toolbar.offsetHeight,
        width: toolbar.offsetWidth,
        left: window.screenLeft,
        top: window.screenTop,
      };
      if (
        bounds.height === this.lastToolbarBounds?.height &&
        bounds.width === this.lastToolbarBounds?.width
      ) {
        return;
      }
      this.lastToolbarBounds = bounds;

      await Client.connect();
      await Client.send('App.boundsChanged', {
        bounds,
      });
    },

    async sendBoundsChanged() {
      const elem = this.appDiv;
      document.dispatchEvent(
        new CustomEvent('app:height-changed', {
          detail: {
            height: elem.offsetHeight,
          },
        }),
      );
    },
  },
  async created() {
    await Client.connect();
    Client.onConnect = () => this.sendBoundsChanged();
  },

  mounted() {
    Client.on('Session.loading', () => (this.isLoading = true));
    Client.on('Session.loaded', () => (this.isLoading = false));
    Client.on('Session.active', this.onSessionActiveEvent);
    window.addEventListener('blur', () => (this.isShowingMenu = false));
    document.addEventListener('keyup', this.onKeypress);
    new ResizeObserver(() => this.sendBoundsChanged()).observe(this.appDiv);
    new ResizeObserver(() => this.sendToolbarHeightChange()).observe(this.toolbarDiv);
  },

  beforeUnmount() {
    clearTimeout(this.timeAgoTimeout);
  },
});
</script>

<style lang="scss">
@import '../../assets/style/resets.scss';

:root {
  --toolbarBackgroundColor: #fffdf4;

  --buttonActiveBackgroundColor: rgba(176, 173, 173, 0.4);
  --buttonHoverBackgroundColor: rgba(255, 255, 255, 0.08);
}

html {
  padding: 0;
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont;
  font-size: 13px;
  &::-webkit-scrollbar {
    display: none;
  }
}

body {
  padding: 0;
  margin: 0;
}

#ChromeAlivePage {
  overflow-y: visible;
  -webkit-app-region: drag;
  vertical-align: top;
  color: rgba(0, 0, 0, 0.8);
  box-sizing: border-box;
  &::-webkit-scrollbar {
    display: none;
  }
  .icon {
    width: 20px;
    height: 20px;
    display: inline-block;
    will-change: background-image;
    transition: 0.15s background-image;
    backface-visibility: hidden;
    background-size: contain;
    background-repeat: no-repeat;
  }

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
    &.loading {
      opacity: 0.5;
      border: 1px solid #3c3c3c;
    }
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

  &.dragging * {
    user-select: none;
  }

  #script-updated {
    margin: 0 5px;
    white-space: nowrap;
    min-width: 175px;
    text-align: center;
  }

  #input-hover {
    width: 300px;
    position: relative;
    top: -2px;
    background: white;
    border-radius: 5px;
    padding: 10px;
    overflow: hidden;
    box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.3);
    transform: translateY(-5px);
    transition: opacity 0.3s, transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);

    #input-size {
      text-align: center;
      font-style: italic;
      color: #3c3c3c;
    }
  }

  #timeline-hover {
    pointer-events: none;
    display: none;
    flex: auto;
    flex-direction: column;
    box-sizing: border-box;
    padding: 2px 3px;
    width: 400px;
    height: 250px;
    position: relative;
    top: -2px;
    background: white;
    border-radius: 5px;
    border: 1px solid #d9d9d9;
    box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.3);
    transition: opacity 0.3s, transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);

    .caret {
      position: absolute;
      box-sizing: border-box;
      top: -16px;
      left: 190px;
      width: 20px;
      height: 20px;
      filter: drop-shadow(-1px -1px 2px rgba(0, 0, 0, 0.3));
      pointer-events: none;
    }

    .url {
      margin-top: 5px;
      padding-bottom: 3px;
      padding-left: 3px;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      border-bottom: 1px solid rgba(0, 0, 0, 0.3);
      box-sizing: border-box;
      margin-bottom: 3px;
    }
    .changes {
      padding-left: 3px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.8);
      box-sizing: border-box;
      padding-bottom: 3px;
    }

    .screenshot {
      display: flex;
      text-transform: uppercase;
      justify-content: center;
      text-align: center;
      box-sizing: border-box;
      padding: 0;
      align-content: center;
      align-items: center;
      flex: 3;
      margin-bottom: 5px;
      position: relative;

      img {
        position: absolute;
        left: 0;
        top: 0;
        object-fit: cover;
        width: 100%;
        height: 100%;
      }

      .status {
        font-weight: bold;
        color: #aaaaaa;
        font-size: 1.4em;
        opacity: 0.5;
        z-index: 2;
      }

      img ~ .status {
        position: absolute;
        top: 5px;
        font-size: 1em;
      }
    }
  }
  &.showingScreenshot {
    #timeline-hover {
      display: flex;
    }
  }

  #bar-menu {
    display: none;
    width: 300px;
    position: relative;
    top: 0;
    padding-bottom: 6px;
    .wrapper {
      padding: 8px 0;
      background: var(--toolbarBackgroundColor);
      border-radius: 0 0 5px 5px;
      overflow: hidden;
      box-shadow: 1px 3px 5px rgba(0, 0, 0, 0.3);
      transition: opacity 0.3s, transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);

      ul {
        margin: 0;
        padding: 0;

        li {
          cursor: pointer;
          list-style: none;
          text-align: left;
          font-size: 15px;
          padding: 5px 10px;
          margin: 0 5px;
          line-height: 20px;

          &:hover {
            background: var(--toolbarBackgroundColor);
          }

          &.divider {
            height: 1px;
            background: #3c3c3c;
            padding: 0;
            margin: 10px 0;
          }
        }
      }
    }
  }
  &.showingMenu {
    #bar-menu {
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
    position: relative;
    transition: 0.2s background-color;
    backface-visibility: hidden;
    margin: 0 5px;
    background-color: transparent;
    border-radius: 4px;
    border-width: 1px;
    padding: 2px 5px;

    &:disabled {
      -webkit-app-region: drag;
      pointer-events: none;
      background-color: var(--buttonActiveBackgroundColor);
      .icon {
        filter: invert(50%);
      }
    }

    &:active,
    &.selected {
      background-color: var(--buttonActiveBackgroundColor) !important;
    }

    &:hover {
      background-color: var(--buttonHoverBackgroundColor);
    }

    .icon {
      width: 14px;
      height: 14px;
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
}
</style>
