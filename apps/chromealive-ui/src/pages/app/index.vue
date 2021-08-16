<template>
  <div id="ChromeAlivePage" :class="{ showingScreenshot: hoveredScreenshot.url }" ref="app">
    <div id="chrome-alive-bar" ref="toolbar">
      <div id="script">
        <div id="status-indicator" class="icon"></div>
        <div id="entrypoint">Bound to {{ session.scriptEntrypoint }}</div>
        <div id="script-updated">(file updated {{ scriptTimeAgo }} ago)</div>
      </div>

      <button
        class="input app-button"
        @click.prevent="toggleInput"
        :class="{ selected: isShowingInput }"
      >
        <span class="label">Input</span>
        <span class="size">({{ session.inputKb }}kb)</span>
      </button>

      <div id="timeline">
        <div id="bar">
          <div id="track">
            <div
              v-for="(tick, i) in session.ticks"
              class="tick"
              :class="{ active: currentTickValue === i }"
              :key="tick.offsetPercent"
              :ref="`tick${i}`"
              @mouseout="hideScreenshot()"
              @mouseover="showScreenshot(i)"
              @click="clickTick(i)"
              :style="{ left: tick.offsetPercent + '%', width: nextTickWidth(i) }"
            >
              <div v-if="i !== session.ticks.length - 1" class="line-overlay"></div>
              <div class="icon marker"></div>
            </div>
            <div id="bar-indicator"></div>
          </div>
        </div>
        <div id="flow-time">Full flow - ({{ session.durationSeconds }} seconds)</div>
      </div>

      <button
        class="output app-button"
        @click.prevent="toggleOutput"
        :class="{ selected: isShowingOutput }"
      >
        <span class="label">Output</span>
        <span class="size">({{ session.outputKb }}kb)</span>
      </button>

      <button
        v-if="!isPlaying"
        @click.prevent="play"
        id="play-button"
        class="app-button"
        :disabled="!canPlay()"
      >
        <span class="label">Start</span>
        <div class="icon"></div>
      </button>
      <button
        v-else
        @click.prevent="pause"
        id="pause-button"
        class="app-button"
        :disabled="!canPause()"
      >
        <span class="label">Stop</span>
        <div class="icon"></div>
      </button>
    </div>

    <div
      id="screenshot-hover"
      v-if="hoveredScreenshot.url"
      :style="{ left: hoveredScreenshot.left + 'px' }"
    >
      <div class="url">{{ hoveredScreenshot.url }}</div>
      <img
        :src="`data:image/jpg;base64,${hoveredScreenshot.imageBase64}`"
        v-if="hoveredScreenshot.imageBase64"
      />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';
import Client from '@/api/Client';
import VueSlider from 'vue-slider-component';
import 'vue-slider-component/theme/default.css';
import ISessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/ISessionActiveEvent';
import { IBounds } from '@ulixee/apps-chromealive-interfaces/apis/IAppBoundsChangedApi';

@Component({
  components: { VueSlider },
})
export default class ChromeAliveApp extends Vue {
  private client = Client;
  private isPlaying = false;
  private isShowingOutput = false;
  private isShowingInput = false;
  private scriptTimeAgo = '';
  private timeAgoTimeout: number;
  private timeAgoDelay = 1e3;
  private currentTickValue = 1;
  private lastAppBounds: IBounds;
  private lastToolbarBounds: IBounds;
  private session: ISessionActiveEvent = {
    ticks: [],
    state: 'paused',
    durationSeconds: 0,
    sessionId: '',
    run: 0,
    outputKb: 0,
    inputKb: 0,
    hasWarning: false,
    scriptEntrypoint: '',
    scriptLastModifiedTime: 0,
  };

  private hoveredScreenshot = {
    left: 0,
    url: '',
    imageBase64: '',
  };

  private screenshotsByNavigationId = new Map<number, string>();

  canPlay(): boolean {
    if (!this.session.sessionId) return false;
    return this.session.state === 'paused';
  }

  canPause(): boolean {
    if (!this.session.sessionId) return false;
    return this.session.state === 'play';
  }

  clickTick(tickIdx: number) {
    this.currentTickValue = tickIdx;
  }

  nextTickWidth(tickIdx: number) {
    if (tickIdx === this.session.ticks.length - 1) return '2px';
    const diff =
      this.session.ticks[tickIdx + 1].offsetPercent - this.session.ticks[tickIdx].offsetPercent;
    return `${diff}%`;
  }

  hideScreenshot() {
    this.hoveredScreenshot.url = '';
    this.hoveredScreenshot.left = 0;
  }

  showScreenshot(tickIdx: number) {
    const entry = this.session.ticks[tickIdx];
    this.hoveredScreenshot.left = this.$refs[`tick${tickIdx}`][0].getBoundingClientRect().left;
    if (this.hoveredScreenshot.left + 300 > window.innerWidth) {
      this.hoveredScreenshot.left = window.innerWidth - 325;
    }
    this.hoveredScreenshot.url = entry.url;
    this.hoveredScreenshot.imageBase64 = this.screenshotsByNavigationId.get(entry.navigationId);
  }

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
  }

  toggleOutput() {
    this.isShowingOutput = !this.isShowingOutput;
  }

  toggleInput() {
    this.isShowingInput = !this.isShowingInput;
  }

  play() {
    this.client.send('Session.resume', {
      sessionId: this.session.sessionId,
      startFromTick: this.currentTickValue,
    });
  }

  pause() {
    this.client.send('Session.step', { sessionId: this.session.sessionId });
  }

  async created() {
    await this.client.connect();
    this.client.onConnect = () => this.sendBoundsChanged();
  }

  updateScriptTimeAgo(): void {
    this.scriptTimeAgo = this.calculateScriptTimeAgo();
    clearTimeout(this.timeAgoTimeout);
    this.timeAgoTimeout = setTimeout(this.updateScriptTimeAgo, this.timeAgoDelay ?? 1e3) as any;
  }

  onSessionActiveEvent(message: ISessionActiveEvent) {
    Object.assign(this.session, message);
    this.currentTickValue = this.session.ticks.length - 1;
    this.updateScriptTimeAgo();

    for (const tick of this.session.ticks) {
      const { navigationId } = tick;
      if (!navigationId) continue;
      if (!this.screenshotsByNavigationId.has(navigationId)) {
        this.client
          .send('Session.tickScreenshot', {
            navigationId,
            sessionId: message.sessionId,
          })
          .then(x => {
            if (x.imageBase64) this.screenshotsByNavigationId.set(navigationId, x.imageBase64);
          })
          .catch(console.error);
      }
    }
  }

  updated() {
    this.$nextTick(function () {
      this.sendBoundsChanged();
    });
  }

  mounted() {
    this.client.on('Session.active', this.onSessionActiveEvent);
  }

  private async sendBoundsChanged() {
    const elem = this.$refs.app as HTMLElement;
    const toolbar = this.$refs.toolbar as HTMLElement;

    const appBounds = {
      height: elem.offsetHeight,
      width: elem.offsetWidth,
      left: window.screenLeft,
      top: window.screenTop,
    };
    const toolbarBounds = {
      height: toolbar.offsetHeight,
      width: toolbar.offsetWidth,
      left: window.screenLeft,
      top: window.screenTop,
    };

    if (
      appBounds.height === this.lastAppBounds?.height &&
      appBounds.width === this.lastAppBounds?.width &&
      toolbarBounds.height === this.lastToolbarBounds?.height &&
      toolbarBounds.width === this.lastToolbarBounds?.width
    ) {
      return;
    }

    await this.client.connect();
    await this.client.send('App.boundsChanged', {
      workarea: (window as any).workarea,
      appBounds,
      toolbarBounds,
    });
  }

  beforeUnmount() {
    clearTimeout(this.timeAgoTimeout);
  }
}
</script>

<style lang="scss">
@import '../../assets/style/resets.scss';

:root {
  --toolbarBackgroundColor: #e7eaed;

  --buttonActiveBackgroundColor: rgba(255, 255, 255, 0.12);
  --buttonHoverBackgroundColor: rgba(255, 255, 255, 0.08);
}

html {
  height: 100%;
  padding: 0;
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont;
  font-size: 13px;
}

body {
  height: 100%;
  padding: 0;
  margin: 0;
}

#ChromeAlivePage {
  -webkit-app-region: drag;
  color: rgba(0, 0, 0, 0.8);
  box-sizing: border-box;

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
    height: 40px;
  }

  #script {
    flex: 2;
    display: flex;
    flex-direction: row;
    line-height: 30px;

    #entrypoint {
      text-align: right;
      text-overflow: ellipsis;
    }

    #status-indicator {
      margin: 10px 5px 5px 10px;
      line-height: 30px;
      vertical-align: center;
      position: relative;
      height: 10px;
      width: 10px;
      background-color: #11bf11;
      border-radius: 50%;
      display: inline-block;
    }

    #script-updated {
      font-style: italic;
      margin-left: 5px;
    }
  }

  #timeline {
    flex: 3;
    position: relative;
    #bar {
      margin: 5px 10px;
      position: relative;
      height: 20px;

      #track {
        position: relative;
        height: 6px;
        top: 9px;
        background-color: #ccc;
        border-radius: 5px;
      }

      .tick {
        height: 40px;
        top: -20px;
        position: absolute;
        min-width: 2px;

        .marker {
          position: absolute;
          top: 5px;
          left: -9px;
          height: 18px;
          width: 18px;
          background-image: url('~@/assets/icons/location.svg');
          opacity: 0.3;
        }

        .line-overlay {
          height: 6px;
          top: 20px;
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
              opacity: 0.5;
            }
            .line-overlay {
              background-color: transparent;
            }
          }
        }

        &.active {
          .marker {
            opacity: 1;
            // turn blue
            filter: invert(41%) sepia(93%) saturate(4467%) hue-rotate(210deg) brightness(95%)
              contrast(87%);
          }
          .line-overlay {
            background-color: #868686;
          }
        }
      }

      #bar-indicator {
        position: absolute;
        top: 0;
        right: 0;
        height: 5px;
        width: 8px;
        border-radius: 5px;
        background-color: #6495ed;
        opacity: 0.7;
      }
    }
    #flow-time {
      position: absolute;
      bottom: -4px;
      width: 100%;
      text-align: center;
      font-size: 0.9em;
    }
  }

  #screenshot-hover {
    display: none;
    width: 300px;
    position: relative;
    top: -2px;
    background: white;
    border-radius: 5px;
    overflow: hidden;
    box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.3);
    //transform: translateY(-5px);
    transition: opacity 0.3s, transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);

    .url {
      font-size: 13px;
      width: 95%;
      text-overflow: ellipsis;
      margin: 2px 5px;
      white-space: nowrap;
      overflow: hidden;
    }
    img {
      width: 100%;
      height: auto;
    }
  }
  &.showingScreenshot {
    #screenshot-hover {
      display: block;
    }
  }

  .output,
  .input {
    .size {
      margin-left: 3px;
      font-size: 0.85em;
    }
  }

  #play-button .label,
  #pause-button .label {
    display: none;
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

    &:active {
      background-color: var(--buttonActiveBackgroundColor) !important;
    }

    &:hover {
      background-color: var(--buttonHoverBackgroundColor);
    }

    .icon {
      width: 14px;
      height: 14px;
    }
  }

  #play-button .icon {
    background-image: url('~@/assets/icons/play.svg');
  }
  #pause-button .icon {
    background-image: url('~@/assets/icons/pause.svg');
  }
}
</style>
