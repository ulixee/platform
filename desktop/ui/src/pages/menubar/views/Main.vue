<template>
  <div id="menu" class="max-h-fit text-base">
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
      <SwitchGroup as="div" class="isolate flex items-center justify-between px-2.5 py-1.5">
        <SwitchLabel as="div" class="flex-grow text-sm font-normal text-gray-700">
          Local Development Cloud
        </SwitchLabel>
        <Switch
          v-model="cloudStarted"
          class="focus:ring-fuchsia-800 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2"
          :class="{
            'bg-fuchsia-800': cloudStarted,
            'bg-gray-400': !cloudStarted,
          }"
        >
          <span class="sr-only">Toggle Ulixee Cloud</span>
          <span
            aria-hidden="true"
            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            :class="{
              'translate-x-5': cloudStarted,
              'translate-x-0': !cloudStarted,
            }"
          />
        </Switch>
      </SwitchGroup>
      <div class="px-2.5 pt-0.5 pb-1.5 text-xs text-gray-500" >
        <template v-if="cloudStarted">ulx://{{ address }}</template>
        <template v-else>Not Started</template>
      </div>
    </div>
    <div class="section">
      <a @click.prevent="quit()">Quit Ulixee Desktop</a>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { ArrowPathIcon, PlayCircleIcon, StopCircleIcon } from '@heroicons/vue/24/outline';
import { Switch, SwitchGroup, SwitchLabel } from '@headlessui/vue';

export default Vue.defineComponent({
  name: 'App',
  components: { Switch, SwitchGroup, SwitchLabel, ArrowPathIcon, PlayCircleIcon, StopCircleIcon },
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

#menu {
  border-radius: 5px;
  padding: 2px;

  a {
    @apply my-0.5 box-border block select-none cursor-pointer whitespace-nowrap px-2.5 py-1.5 text-sm;
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
