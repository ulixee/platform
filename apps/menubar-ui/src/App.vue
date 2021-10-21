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
      <a @click.prevent="openLogsDirectory()">Open App Logs</a>
      <a @click.prevent="openDataDirectory()">Open Data Directory</a>
    </div>
    <div class="section">
      <a>Preferences</a>
      <a>About Ulixee</a>
    </div>
    <div class="section">
      <a @click.prevent="quit()">Quit</a>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';

export default Vue.defineComponent({
  name: 'App',
  components: {},
  setup() {
    let serverStarted = Vue.ref(false);
    let address = Vue.ref('');

    document.addEventListener('boss:event', evt => {
      console.log('Boss:event', evt);
      const { eventType, data } = (evt as CustomEvent).detail;
      if (eventType === 'Server.status') {
        address.value = data.address;
        serverStarted.value = data.started;
      }
    });

    return { serverStarted, address };
  },
  mounted() {
    this.sendEvent('Server.getStatus');
  },
  methods: {
    quit() {
      this.sendEvent('App.quit');
    },
    restart() {
      this.sendEvent('Server.restart');
    },
    start() {
      this.sendEvent('Server.start');
    },
    stop() {
      this.sendEvent('Server.stop');
    },
    openLogsDirectory() {
      this.sendEvent('App.openLogsDirectory')
    },
    openDataDirectory() {
      this.sendEvent('App.openDataDirectory')
    },
    sendEvent(api: string, ...args: any[]) {
      document.dispatchEvent(
        new CustomEvent('boss:api', {
          detail: { api, args },
        }),
      );
    }
  }
});
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
