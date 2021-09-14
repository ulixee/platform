<template>
  <div
    id="ChromeAlivePage"
    :class="{ showingScreenshot: hoveredScreenshot.url, showingMenu: isShowingMenu }"
    ref="app"
  >
    <div id="chrome-alive-bar" ref="toolbar" :class="{ loading: isLoading }">
      <div id="script">
        <button @click.prevent="toggleMenu()" id="menu-button" class="app-button" ref="menuButton">
          <span class="label">Menu</span>
          <div class="icon"></div>
        </button>
        <div id="entrypoint">
          ChromeAlive bound to <i>{{ session.scriptEntrypoint }}</i>
        </div>
      </div>

      <div id="timeline">
        <div id="bar">
          <div id="track">
            <div
              v-for="(url, i) in session.loadedUrls"
              class="tick"
              :class="{ active: currentUrlIndex === i }"
              :key="url.offsetPercent"
              :ref="`tick${i}`"
              @mouseout="hideScreenshot()"
              @mouseover="showScreenshot(i)"
              @click="clickUrlTick(i)"
              :style="{ left: url.offsetPercent + '%', width: nextUrlTickWidth(i) }"
            >
              <div v-if="i !== session.loadedUrls.length - 1" class="line-overlay"></div>
              <div class="marker"></div>
            </div>
            <div id="nib" :style="{ left: nibLeftPercent + '%' }"></div>
          </div>
        </div>
      </div>
      <div id="script-updated">(script updated {{ scriptTimeAgo }} ago)</div>

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

    <div id="bar-menu" v-if="isShowingMenu" :style="{ left: menuOffset.left + 'px' }">
      <div class="wrapper">
        <ul class="menu-items">
          <li class="databox-toggle" @click.prevent="toggleDatabox()">
            {{ databoxWindow !== null ? 'Hide' : 'Show' }} Databox Panel
          </li>
          <li class="rerun-script" @click.prevent="playFromTick(0)">Rerun script from beginning</li>
          <li class="quit-script" @click.prevent="quitScript()">Shutdown Chrome + Script</li>
          <li class="divider"></li>
          <li class="about" @click.prevent="showAbout()">About ChromeAlive!</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';
import Client from '@/api/Client';
import VueSlider from 'vue-slider-component';
import 'vue-slider-component/theme/default.css';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import { IBounds } from '@ulixee/apps-chromealive-interfaces/apis/IAppBoundsChangedApi';

@Component({
  components: { VueSlider },
})
export default class ChromeAliveApp extends Vue {
  private client = Client;
  private scriptTimeAgo = '';
  private timeAgoTimeout: number;
  private timeAgoDelay = 1e3;
  private currentUrlIndex = 1;
  private lastToolbarBounds: IBounds;
  private databoxWindow: Window = null;
  private hasLaunchedDatabox = false;
  private isLoading = false;
  private isShowingMenu = false;
  private nibLeftPercent = 100;

  private session: IHeroSessionActiveEvent = {
    loadedUrls: [],
    state: 'paused',
    durationSeconds: 0,
    heroSessionId: '',
    run: 0,
    hasWarning: false,
    scriptEntrypoint: '',
    scriptLastModifiedTime: 0,
  };

  private hoveredScreenshot = {
    left: 0,
    url: '',
    imageBase64: '',
  };

  private menuOffset = {
    left: 0,
  };

  private screenshotsByNavigationId = new Map<number, string>();

  private get isPlaying() {
    return this.session?.state === 'play';
  }

  quitScript() {
    this.client.send('Session.quit', {
      heroSessionId: this.session.heroSessionId,
    });
  }

  showAbout(): void {
    this.isShowingMenu = false;
    console.log(
      'ChromeAlive! is your live interface for controlling Ulixee Databoxes using the Hero web scraper',
    );
  }

  canPlay(): boolean {
    if (!this.session.heroSessionId) return false;
    return this.session.state === 'paused';
  }

  canPause(): boolean {
    if (!this.session.heroSessionId) return false;
    return this.session.state === 'play';
  }

  playFromTick(tickIndex: number) {
    this.currentUrlIndex = tickIndex;
    this.play();
  }

  clickUrlTick(urlIndex: number) {
    this.currentUrlIndex = urlIndex;
    this.nibLeftPercent = this.session.loadedUrls[urlIndex].offsetPercent;
  }

  nextUrlTickWidth(urlIndex: number) {
    if (urlIndex === this.session.loadedUrls.length - 1) return '2px';
    const diff =
      this.session.loadedUrls[urlIndex + 1].offsetPercent -
      this.session.loadedUrls[urlIndex].offsetPercent;
    return `${diff}%`;
  }

  hideScreenshot() {
    this.hoveredScreenshot.url = '';
    this.hoveredScreenshot.left = 0;
  }

  showScreenshot(urlIndex: number) {
    const entry = this.session.loadedUrls[urlIndex];
    this.hoveredScreenshot.left = this.$refs[`tick${urlIndex}`][0].getBoundingClientRect().left;
    if (this.hoveredScreenshot.left + 500 > window.innerWidth) {
      this.hoveredScreenshot.left = window.innerWidth - 525;
    }
    this.hoveredScreenshot.url = entry.url;
    this.hoveredScreenshot.imageBase64 = this.screenshotsByNavigationId.get(entry.navigationId);
  }

  toggleMenu() {
    this.menuOffset.left = (this.$refs.menuButton as HTMLElement).getBoundingClientRect().left;
    this.isShowingMenu = !this.isShowingMenu;
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
  }

  play() {
    this.client.send('Session.resume', {
      heroSessionId: this.session.heroSessionId,
      startFromUrlIndex: this.currentUrlIndex,
    });
  }

  pause() {
    this.client.send('Session.step', { heroSessionId: this.session.heroSessionId });
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

  onSessionActiveEvent(message: IHeroSessionActiveEvent) {
    Object.assign(this.session, message);
    this.currentUrlIndex = Math.max(0, this.session.loadedUrls.length - 1);
    this.updateScriptTimeAgo();

    if (!this.hasLaunchedDatabox && !this.databoxWindow) {
      this.hasLaunchedDatabox = true;
      this.toggleDatabox();
    }

    for (const loadedUrl of this.session.loadedUrls) {
      const { navigationId, hasScreenshot } = loadedUrl;
      if (!navigationId || !hasScreenshot) continue;
      if (!this.screenshotsByNavigationId.has(navigationId)) {
        this.client
          .send('Session.urlScreenshot', {
            navigationId,
            sessionId: message.heroSessionId,
          })
          .then(x => {
            if (x.imageBase64) this.screenshotsByNavigationId.set(navigationId, x.imageBase64);
          })
          .catch(console.error);
      }
    }
  }

  mounted() {
    this.client.on('Session.loading', () => (this.isLoading = true));
    this.client.on('Session.loaded', () => (this.isLoading = false));
    this.client.on('Session.active', this.onSessionActiveEvent);
    window.addEventListener('blur', () => (this.isShowingMenu = false));
    new ResizeObserver(() => this.sendBoundsChanged()).observe(this.$refs.app as HTMLElement);
    new ResizeObserver(() => this.sendToolbarHeightChange()).observe(
      this.$refs.toolbar as HTMLElement,
    );
  }

  private async sendToolbarHeightChange() {
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

    await this.client.connect();
    await this.client.send('App.boundsChanged', {
      bounds,
    });
  }

  private async sendBoundsChanged() {
    const elem = this.$refs.app as HTMLElement;
    document.dispatchEvent(
      new CustomEvent('app:height-changed', {
        detail: {
          height: elem.offsetHeight,
        },
      }),
    );
  }

  beforeUnmount() {
    clearTimeout(this.timeAgoTimeout);
  }
}
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

  #timeline {
    flex: 3;
    position: relative;
    #bar {
      margin: 5px 10px;
      position: relative;
      height: 20px;

      #track {
        position: relative;
        height: 7px;
        top: 8px;
        background-color: #ccc;
      }

      .tick {
        height: 36px;
        top: -16px;
        position: absolute;
        min-width: 2px;

        .marker {
          position: absolute;
          top: 13px;
          left: 0;
          height: 12px;
          width: 2px;
          background-color: #2d2d2d;
          opacity: 0.3;
          border-left: 1px white solid;
          border-right: 1px white solid;
        }

        .line-overlay {
          height: 7px;
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
              opacity: 0.5;
            }
            .line-overlay {
              background-color: transparent;
            }
          }
        }

        &.active {
          .marker {
            opacity: 0.1;
          }
          .line-overlay {
            background-color: #868686;
          }
        }
      }

      #nib {
        position: absolute;
        top: -4px;
        margin-left: -4px;
        height: 12px;
        width: 12px;
        border-radius: 14px;
        background-color: white;
        border: 1px solid #666;
        box-shadow: -1px 1px 2px rgba(0, 0, 0, 0.6);
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

  #screenshot-hover {
    display: none;
    width: 500px;
    position: relative;
    top: -2px;
    background: white;
    border-radius: 5px;
    overflow: hidden;
    box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.3);
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

  #menu-button .label,
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
}
</style>
