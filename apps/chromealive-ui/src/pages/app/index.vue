<template>
  <div
    id="ChromeAlivePage"
    :class="{ showingScreenshot: timelineHover.show, showingMenu: isShowingMenu, dragging: isDragging }"
    ref="app"
  >
    <div id="chrome-alive-bar" ref="toolbar" :class="{ loading: isLoading }">
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

      <div id="timeline">
        <div id="bar" @mouseout="trackMouseout" @mouseover="trackMouseover">
          <div id="track" ref="track">
            <div
              v-for="(url, i) in session.urls"
              class="tick"
              :class="{ active: isActiveUrl(i) }"
              :key="url.offsetPercent"
              :ref="`tick${i}`"
              @click.prevent="clickUrlTick($event, url.navigationId)"
              :style="{ left: url.offsetPercent + '%', width: nextUrlTickWidth(i) }"
            >
              <div v-if="i !== session.urls.length - 1" class="line-overlay"></div>
              <div class="marker"></div>
            </div>
            <div
              @mousedown="startDraggingNib()"
              ref="nib"
              id="nib"
              :class="{ 'live-mode': isLive }"
              :style="{ left: nibLeft }"
            ></div>
          </div>
        </div>
      </div>
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

    <div id="timeline-hover" :style="{ left: timelineHover.left + 'px' }" ref="timelineHover">
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
import 'vue-slider-component/theme/default.css';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import { IBounds } from '@ulixee/apps-chromealive-interfaces/apis/IAppBoundsChangedApi';
import { ISessionResumeArgs } from '@ulixee/apps-chromealive-interfaces/apis/ISessionResumeApi';

const ICON_CARET = require('@/assets/icons/caret.svg');

type IStartLocation = ISessionResumeArgs['startLocation'];

export default Vue.defineComponent<any>({
  name: 'App',
  components: {},
  setup() {
    let scriptTimeAgo = Vue.ref('');
    let timeAgoTimeout: number;
    let timeAgoDelay = 1e3;
    let selectedNavigationId = null;
    let lastToolbarBounds: IBounds;
    let databoxWindow: Window = Vue.reactive(null);
    let hasLaunchedDatabox = false;
    let isLoading = Vue.ref(false);
    let isShowingMenu = Vue.ref(false);
    let isDragging = Vue.ref(false);
    let nibLeft = Vue.ref('100%');
    let trackOffset: DOMRect;
    let isHistoryMode = Vue.ref(false);
    let startLocation: Vue.Ref<IStartLocation> = Vue.ref<IStartLocation>('currentLocation');
    let pendingReplayNavigationOffset: number = null;

    let session: IHeroSessionActiveEvent = {
      urls: [],
      paintEvents: [],
      screenshots: [],
      playbackState: 'paused',
      runtimeMs: 0,
      heroSessionId: '',
      run: 0,
      hasWarning: false,
      scriptEntrypoint: '',
      scriptLastModifiedTime: 0,
    };

    let timelineHover = {
      left: 0,
      url: '',
      domChanges: 0,
      runtime: '',
      status: '',
      imageBase64: '',
      show: false,
    };

    let menuOffset = {
      left: 0,
    };

    let screenshotsByTimestamp = new Map<number, string>();
    let screenshotTimestampsByOffset = new Map<number, number>();
    let timelineHoverWidth: number;

    const isLive = Vue.computed(() => {
      return session?.playbackState === 'live';
    });

    return {
      ICON_CARET, scriptTimeAgo, timeAgoTimeout, timeAgoDelay, selectedNavigationId, lastToolbarBounds,
      databoxWindow, hasLaunchedDatabox, isLoading, isShowingMenu, isDragging, nibLeft, trackOffset, isHistoryMode,
      startLocation, pendingReplayNavigationOffset, session, timelineHover, menuOffset, screenshotsByTimestamp,
      screenshotTimestampsByOffset, timelineHoverWidth, isLive,
    };
  },
  methods: {
    onKeypress(event: KeyboardEvent): void {
      // let this trigger history mode
      if (event.code === 'ArrowLeft') {
        this.historyBack();
      }
      if (event.code === 'ArrowRight' && this.isHistoryMode) {
        this.historyForward();
      }
    },

    toggleMenu() {
      this.menuOffset.left = (this.$refs.menuButton as HTMLElement).getBoundingClientRect().left;
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

    isActiveUrl(index: number) {
      if (index === 0) return this.startLocation === 'sessionStart';
      if (index === this.session.urls.length - 1) return this.startLocation === 'currentLocation';
      return this.selectedNavigationId === this.session.urls[index].navigationId;
    },

    clickUrlTick(event: MouseEvent, navigationId: number) {
      this.selectedNavigationId = navigationId;
      this.onNibMove(event);
      this.replay().catch(console.error);
    },

    nextUrlTickWidth(urlIndex: number) {
      if (urlIndex === this.session.urls.length - 1) return '2px';
      const diff =
        this.session.urls[urlIndex + 1].offsetPercent - this.session.urls[urlIndex].offsetPercent;
      return `${diff}%`;
    },

    trackMouseout() {
      window.removeEventListener('mousemove', this.trackMousemove);
      this.timelineHover.show = false;
    },

    trackMouseover() {
      if (this.isLive) return;
      window.addEventListener('mousemove', this.trackMousemove);
    },

    trackMousemove(event: MouseEvent) {
      const offset = this.getTrackOffset(event);
      this.timelineHoverWidth ||= (
        this.$refs.timelineHover as HTMLElement
      ).getBoundingClientRect().width;

      this.timelineHover.left = event.pageX - Math.round(this.timelineHoverWidth / 2);

      const runtimeMs = Math.round((offset / 100) * this.session.runtimeMs);
      this.timelineHover.runtime = `${runtimeMs}ms`;
      if (runtimeMs > 1e3) {
        const runtimeSecs = Math.round(10 * (runtimeMs / 1000)) / 10;
        this.timelineHover.runtime = `${runtimeSecs}s`;
      }

      let lastChanges = 0;
      for (const paint of this.session.paintEvents) {
        // go until this change is after the current offset
        if (paint.offsetPercent > offset) break;
        lastChanges = paint.domChanges;
      }
      this.timelineHover.domChanges = lastChanges;
      this.timelineHover.status = 'Loading';

      let loadedUrl: IHeroSessionActiveEvent['urls'][0] = null;
      for (const url of this.session.urls) {
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

        this.timelineHover.status = statusText;
      }
      this.timelineHover.url = loadedUrl?.url;
      const timestamp = this.screenshotTimestampsByOffset.get(offset);
      this.timelineHover.imageBase64 = this.screenshotsByTimestamp.get(timestamp);
      this.timelineHover.show = true;
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

    toggleDatabox() {
      if (this.isShowingMenu) this.isShowingMenu = false;
      if (this.databoxWindow) {
        this.databoxWindow.close();
        this.databoxWindow = null;
      } else {
        const { bottom, right } = (this.$refs.toolbar as HTMLElement).getBoundingClientRect();
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

    startDraggingNib() {
      if (this.isLive) return;
      window.addEventListener('mousemove', this.onNibMove);
      this.isDragging = true;
    },

    stopDraggingNib() {
      window.removeEventListener('mousemove', this.onNibMove);
      if (!this.isDragging) return;
      this.isDragging = false;
      this.replay();
    },

    onNibMove(e) {
      e.preventDefault();

      const start = this.nibLeft;
      const percentOffset = this.getTrackOffset(e);

      this.nibLeft = percentOffset + '%';
      this.isHistoryMode = this.nibLeft !== '100%';
      if (this.session.heroSessionId && start !== this.nibLeft) {
        this.pendingReplayNavigationOffset = percentOffset;
      }
    },

    async replay() {
      if (this.pendingReplayNavigationOffset === null) return;
      const percentOffset = this.pendingReplayNavigationOffset;
      this.pendingReplayNavigationOffset = null;
      await Client.send('Session.replay', {
        heroSessionId: this.session.heroSessionId,
        percentOffset,
      });
    },

    async historyForward() {
      const { timelineOffsetPercent } = await Client.send('Session.replay', {
        heroSessionId: this.session.heroSessionId,
        step: 'forward',
      });
      this.nibLeft = `${timelineOffsetPercent}%`;
      if (timelineOffsetPercent === 100) this.isHistoryMode = false;
    },

    async historyBack() {
      if (!this.isHistoryMode) return;
      const { timelineOffsetPercent } = await Client.send('Session.replay', {
        heroSessionId: this.session.heroSessionId,
        step: 'back',
      });
      this.nibLeft = `${timelineOffsetPercent}%`;
    },

    canPlay(): boolean {
      if (!this.session.heroSessionId) return false;
      return this.session.playbackState === 'paused';
    },

    canPause(): boolean {
      if (!this.session.heroSessionId) return false;
      return this.isLive;
    },

    resumeFrom(startLocation: IStartLocation, navigationId?: number) {
      this.startLocation = startLocation;
      this.selectedNavigationId = navigationId;
      this.resume();
    },

    resume() {
      Client.send('Session.resume', {
        heroSessionId: this.session.heroSessionId,
        startLocation: this.startLocation,
        startFromNavigationId: this.selectedNavigationId,
      });
    },

    pause() {
      Client.send('Session.step', { heroSessionId: this.session.heroSessionId });
    },

    async created() {
      await Client.connect();
      Client.onConnect = () => this.sendBoundsChanged();
    },

    updateScriptTimeAgo(): void {
      this.scriptTimeAgo = this.calculateScriptTimeAgo();
      clearTimeout(this.timeAgoTimeout);
      this.timeAgoTimeout = setTimeout(this.updateScriptTimeAgo, this.timeAgoDelay ?? 1e3) as any;
    },

    onSessionActiveEvent(message: IHeroSessionActiveEvent) {
      const isNewId = message.heroSessionId !== this.session.heroSessionId || !message.heroSessionId;
      Object.assign(this.session, message);
      this.isHistoryMode = this.session.playbackState === 'history';

      if (isNewId || !this.isHistoryMode) {
        this.nibLeft = '100%';
        this.selectedNavigationId = null;
        this.timelineHover.show = false;
      }

      this.updateScriptTimeAgo();

      if (!this.hasLaunchedDatabox && !this.databoxWindow) {
        this.hasLaunchedDatabox = true;
        this.toggleDatabox();
      }

      let lastOffset: number = null;
      this.screenshotTimestampsByOffset.clear();
      if (!this.session.screenshots.length) this.screenshotsByTimestamp.clear();

      for (const screenshot of this.session.screenshots) {
        if (!this.screenshotsByTimestamp.has(screenshot.timestamp)) {
          // placeholder while retrieving
          this.screenshotsByTimestamp.set(screenshot.timestamp, null);
          Client
            .send('Session.getScreenshot', {
              timestamp: screenshot.timestamp,
              sessionId: message.heroSessionId,
            })
            .then(x => {
              if (x.imageBase64) this.screenshotsByTimestamp.set(screenshot.timestamp, x.imageBase64);
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
      const lastScreenshot = this.session.screenshots[this.session.screenshots.length - 1];
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

    getTrackOffset(event: MouseEvent): number {
      this.trackOffset ??= (this.$refs.track as HTMLElement).getBoundingClientRect();
      let percentOffset = (100 * (event.pageX - this.trackOffset.x)) / this.trackOffset.width;
      percentOffset = Math.round(10 * percentOffset) / 10;
      if (percentOffset > 100) percentOffset = 100;
      if (percentOffset < 0) percentOffset = 0;
      return percentOffset;
    },

    async sendToolbarHeightChange() {
      const toolbar = this.$refs.toolbar as HTMLElement;
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
      const elem = this.$refs.app as HTMLElement;
      document.dispatchEvent(
        new CustomEvent('app:height-changed', {
          detail: {
            height: elem.offsetHeight,
          },
        }),
      );
    },
  },
  mounted() {
    Client.on('Session.loading', () => (this.isLoading = true));
    Client.on('Session.loaded', () => (this.isLoading = false));
    Client.on('Session.active', this.onSessionActiveEvent);
    document.addEventListener("keyup", this.onKeypress);
    window.addEventListener('blur', () => (this.isShowingMenu = false));
    window.addEventListener('mouseup', this.stopDraggingNib);
    new ResizeObserver(() => this.sendBoundsChanged()).observe(this.$refs.app as HTMLElement);
    new ResizeObserver(() => this.sendToolbarHeightChange()).observe(
      this.$refs.toolbar as HTMLElement,
    );
  },

  beforeUnmount() {
    clearTimeout(this.timeAgoTimeout);
  },
});
</script>

<style lang="scss">
@import '../../assets/style/resets.scss';
@import '../../assets/style/flatjson';

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
    #flow-time {
      position: absolute;
      bottom: -4px;
      width: 100%;
      text-align: center;
      font-size: 0.95em;
    }
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
