<template>
  <div id="menu" class="text-base max-h-fit">
    <div class="section">
      <a @click.prevent="openDesktop()">Open Ulixee Desktop</a>
      <a v-if="downloadProgress > 0 && downloadProgress < 100"
        >Downloading new Version <span class="progress">{{ downloadProgress }}%</span></a
      >
      <a v-else-if="isInstalling" @click.prevent="void 0"
        >Installing <span class="installing-version">{{ newVersion }}</span></a
      >
      <a v-else-if="newVersion" @click.prevent="installUpdate"
        >Update Available
        <span class="new-version"
          >{{ downloadProgress < 100 ? '' : 'Install ' }}{{ newVersion }}</span
        ></a
      >
      <a v-else @click.prevent="checkForUpdate"
        >Check for Updates <span v-if="onLatestVersion" class="latest-version">On Latest</span></a
      >
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
        <CloudIcon
          class="relative -top-0.5 mx-2 inline h-5 stroke-2"
          :class="[cloudStarted ? 'text-emerald-500' : 'text-gray-500']"
        />
        <span v-if="cloudStarted" class="text-sm font-normal text-gray-700"
          >Local Cloud running at {{ address }}</span
        >
        <span v-else class="text">Local Cloud is not running</span>
      </div>
      <div class="isolate mt-5 flex justify-center">
        <button
          class="relative inline-flex items-center rounded-l-md bg-white px-5 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-500 hover:bg-gray-50 focus:z-10 focus:ring-gray-600"
          v-if="cloudStarted"
          @click.prevent="cloudStarted ? stop() : start()"
        >
          <StopCircleIcon v-if="cloudStarted" class=" inline w-6 pr-1  text-gray-500" />
          <PlayCircleIcon v-else class=" inline w-6 pr-2  text-gray-500" />
          {{ cloudStarted ? 'Stop' : 'Start' }}
        </button>
        <button
          class="relative -ml-px inline-flex items-center rounded-r-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-500 hover:bg-gray-50 focus:z-10  focus:ring-gray-600"
          @click.prevent="restart()"
        >
          <ArrowPathIcon class=" inline w-6 pr-1 text-gray-500" />
          Restart
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import {
  CloudIcon,
  ArrowPathIcon,
  StopCircleIcon,
  PlayCircleIcon,
} from '@heroicons/vue/24/outline';

export default Vue.defineComponent({
  name: 'App',
  components: { CloudIcon, ArrowPathIcon, PlayCircleIcon, StopCircleIcon },
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
*,
a,
button {
  cursor: default;
  user-select: none;
}

#menu {
  border-radius: 5px;
  padding: 2px;

  a {
    @apply text-sm cursor-pointer px-2.5 py-1.5 whitespace-nowrap my-0.5 block box-border;
    &:hover {
      @apply bg-fuchsia-700 text-white;
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
}
</style>
