<template>
  <div id="menu">
    <div class="section">
      <ul class="basic-stats">
        <li>
          <div class="num">1</div>
          <div class="label">SERVER</div>
        </li>
        <li>
          <div class="num">1</div>
          <div class="label">DATABOX</div>
        </li>
        <li>
          <div class="num">1</div>
          <div class="label">QUERIES</div>
        </li>
      </ul>
    </div>
    <div class="section">
      <div class="server-status">
        <span class="circle" :class="{ stopped: !serverStarted }"></span>
        <span v-if="serverStarted" class="text">Ulixee Server is running on {{ address }}</span>
        <span v-else class="text">Server not running</span>
      </div>
      <button v-if="serverStarted" @click.prevent="stop()">Stop</button>
      <button v-else @click.prevent="start()">Start</button>
      <button @click.prevent="restart()">Restart</button>
    </div>
    <div class="section">
      <a>Open Ulixee Desktop</a>
    </div>
    <div class="section">
      <a>Preferences</a>
      <a @click.prevent="showLogs()">Open App Logs</a>
      <a>About Ulixee</a>
    </div>
    <div class="section">
      <a @click.prevent="quit()">Quit</a>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';

@Component
export default class Menubar extends Vue {
  private windowBackground = '';
  private serverStarted = false;
  private address = '';

  quit() {
    this.sendEvent('App.quit');
  }

  restart() {
    this.sendEvent('Server.restart');
  }

  start() {
    this.sendEvent('Server.start');
  }

  stop() {
    this.sendEvent('Server.stop');
  }

  showLogs() {
    this.sendEvent('App.logs')
  }

  private sendEvent(api: string, ...args: any[]) {
    document.dispatchEvent(
      new CustomEvent('boss:api', {
        detail: { api, args },
      }),
    );
  }

  public created(): void {
    document.addEventListener('boss:event', evt => {
      console.log('Boss:event', evt);
      const { eventType, data } = (evt as CustomEvent).detail;
      if (eventType === 'Server.status') {
        this.address = data.address;
        this.serverStarted = data.started;
      }
    });
    this.sendEvent('Server.getStatus')
  }

  public mounted(): void {
    const params = new URLSearchParams(window.location.search);
    this.windowBackground = params.get('windowBackground') || '';
  }
}
</script>

<style lang="scss">
@import './scss/reset.scss';

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

*,
a,
button {
  cursor: default;
  user-select: none;
}

#menu {
  border-radius: 5px;
  background-color: Menu;
  height: 100%;
  width: 100%;
  padding: 2px;
  box-sizing: border-box;

  a {
    &:hover {
      background-color: Highlight;
      color: HighlightText;
    }
    display: block;
    border-radius: 4px;
    padding: 5px 2px;
  }

  .section {
    &:last-child {
      border-bottom: none;
      box-shadow: none;
    }
    padding: 10px 5px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  }
  .server-status {
    .circle {
      width: 10px;
      height: 10px;
      display: inline-block;
      border: 1px solid green;
      background-color: greenyellow;
      border-radius: 50%;
      margin-right: 5px;
    }
  }
  ul.basic-stats {
    @include reset-ul();
    margin: 3px 0;
    li {
      display: inline-block;
      width: 33.333333%;
      text-align: center;
      border-right: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 1px 0 0 rgba(255, 255, 255, 0.5);
      box-sizing: border-box;
    }
    li:last-child {
      border: none;
      box-shadow: none;
    }
    .num {
      font-weight: 900;
      font-size: 20px;
    }
  }
}
</style>
