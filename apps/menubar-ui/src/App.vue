<template>
  <div id="menu">
    <div class="section">
      <a class="disabled">Open Ulixee Manager <span class="coming-soon">Coming Soon</span></a>
      <a class="disabled">Open Ulixee Composer <span class="coming-soon">Coming Soon</span></a>
      <a class="disabled">Open Ulixee Marketplace <span class="coming-soon">Coming Soon</span></a>
      <a>Preferences...</a>
      <a>Check for Updates</a>
    </div>
    <div class="section">
      <a @click.prevent="openLogsDirectory()">Open App Logs</a>
      <a @click.prevent="openDataDirectory()">Open Data Directory</a>
    </div>
    <div class="section">
      <a @click.prevent="quit()">Shutdown Ulixee</a>
    </div>
    <div class="section">
      <div class="server-status">
        <span class="circle" :class="{ stopped: !serverStarted }"></span>
        <span v-if="serverStarted" class="text">Server is running on {{ address }}</span>
        <span v-else class="text">Server is not running</span>
      </div>
      <div class="server-actions">
        <button v-if="serverStarted" @click.prevent="stop()">Stop</button>
        <button v-else @click.prevent="start()">Start</button>
        <button @click.prevent="restart()">Restart</button>
      </div>
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
      this.sendEvent('App.openLogsDirectory');
    },
    openDataDirectory() {
      this.sendEvent('App.openDataDirectory');
    },
    sendEvent(api: string, ...args: any[]) {
      document.dispatchEvent(
        new CustomEvent('boss:api', {
          detail: { api, args },
        }),
      );
    },
  },
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
    .coming-soon {
      text-transform: uppercase;
      font-weight: lighter;
      font-size: 0.9em;
      border-radius: 5px;
      float: right;
      padding: 2px 5px;
      margin-right: 20px;
      margin-top: -2px;
      border: 1px solid #595959;
    }
    &.disabled {
      color: #595959;
      &:hover {
        background-color: #eee;
        .coming-soon {
          opacity: 0.2;
        }
      }
    }
    box-sizing: border-box;
    display: block;
    margin: 3px 0;
    padding: 5px 7px;
  }

  .section {
    &:last-child {
      border-bottom: none;
      box-shadow: none;
    }
    padding: 7px 0;
    margin: 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  }
  .server-status {
    padding: 8px 10px;
    font-weight: bold;
    .circle {
      width: 10px;
      height: 10px;
      display: inline-block;
      border: 1px solid green;
      background-color: greenyellow;
      border-radius: 50%;
      margin-right: 5px;
      vertical-align: text-top;
      margin-top: 2px;
      &.stopped {
        background-color: lightgrey;
      }
    }
  }
  .server-actions {
    padding: 8px 10px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-content: space-between;
    button {
      flex-grow: 1;
      width: 35%;
      padding: 3px 5px;
      &:first-child{
        margin-right: 30px;
      }
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
