<template>
  <div id="menu">
    <div class="section">
      <a @click.prevent="openDesktop()">Open Ulixee Desktop</a>
      <a v-if="downloadProgress > 0 && downloadProgress < 100">Downloading new Version <span class="progress">{{ downloadProgress }}%</span></a>
      <a
        v-else-if="isInstalling"
        @click.prevent="void 0"
      >Installing <span class="installing-version">{{ newVersion }}</span></a>
      <a
        v-else-if="newVersion"
        @click.prevent="installUpdate"
      >Update Available <span class="new-version">{{ downloadProgress < 100 ? '' : 'Install ' }}{{ newVersion }}</span></a>
      <a
        v-else
        @click.prevent="checkForUpdate"
      >Check for Updates <span v-if="onLatestVersion" class="latest-version">On Latest</span></a>
    </div>
    <div class="section">
      <a @click.prevent="openLogsDirectory()">Open App Logs</a>
      <a @click.prevent="openDataDirectory()">Open Data Directory</a>
    </div>
    <div class="section">
      <a @click.prevent="quit()">Shutdown Ulixee</a>
    </div>
    <div class="section">
      <div class="cloud-status">
        <span class="circle" :class="{ stopped: !cloudStarted }" />
        <span v-if="cloudStarted" class="text">Local Cloud running at {{ address }}</span>
        <span v-else class="text">Local Cloud is not running</span>
      </div>
      <div class="cloud-actions">
        <button v-if="cloudStarted" @click.prevent="stop()">
          Stop
        </button>
        <button v-else @click.prevent="start()">
          Start
        </button>
        <button @click.prevent="restart()">
          Restart
        </button>
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
    return {
      cloudStarted: Vue.ref(false),
      address: Vue.ref(''),
      onLatestVersion: Vue.ref(false),
      isInstalling: Vue.ref(false),
      newVersion: Vue.ref(''),
      downloadProgress: Vue.ref(0),
    };
  },
  mounted() {
    document.addEventListener('desktop:event', evt => {
      try {
        console.log('desktop:event', evt);
      } catch (err) {}
      const { eventType, data } = (evt as CustomEvent).detail;
      if (eventType === 'Cloud.status') {
        this.address = data.address;
        this.cloudStarted = data.started;
      }
      if (eventType === 'Version.onLatest') {
        this.onLatestVersion = true;
      }
      if (eventType === 'Version.available') {
        this.onLatestVersion = false;
        this.newVersion = data.version;
        this.downloadProgress = 0;
      }
      if (eventType === 'Version.installing') {
        this.isInstalling = true;
      }
      if (eventType === 'Version.download') {
        this.downloadProgress = data.progress;
      }
    });

    this.sendApi('Cloud.getStatus');
  },
  methods: {
    quit() {
      this.sendApi('App.quit');
    },
    restart() {
      this.sendApi('Cloud.restart');
    },
    start() {
      this.sendApi('Cloud.start');
    },
    stop() {
      this.sendApi('Cloud.stop');
    },
    openDesktop() {
      this.sendApi('App.openDesktop');
    },
    openLogsDirectory() {
      this.sendApi('App.openLogsDirectory');
    },
    openDataDirectory() {
      this.sendApi('App.openDataDirectory');
    },
    installUpdate() {
      this.sendApi('Version.install');
    },
    checkForUpdate() {
      this.sendApi('Version.check');
    },
    sendApi(api: string, ...args: any[]) {
      document.dispatchEvent(
        new CustomEvent('desktop:api', {
          detail: { api, args },
        }),
      );
    },
  },
});
</script>

<style lang="scss">
@import '../../../assets/style/resets.scss';

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
    .coming-soon,
    .latest-version,
    .new-version,
    .installing-version,
    .progress {
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

    .progress {
      background-color: #848484;
      color: #eeeeee;
      font-weight: bold;
    }

    .new-version,
    .installing-version {
      background-color: #039403;
      font-weight: 700;
      color: #eee;
      font-size: 0.8em;
    }

    .installing-version {
      background-color: #027fea;
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

    white-space: nowrap;
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
  .cloud-status {
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
  .cloud-actions {
    padding: 8px 10px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-content: space-between;
    button {
      flex-grow: 1;
      width: 35%;
      padding: 3px 5px;
      &:first-child {
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
