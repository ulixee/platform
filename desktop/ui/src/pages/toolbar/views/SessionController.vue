<template>
  <div class="bar-wrapper flex flex-row items-stretch" :class="{ isRestarting }">
    <MenuButton class="z-20" />
    <InputButton
      :is-selected="mode === 'Input'"
      :is-focused="mode === 'Input'"
      :is-minimal="isMinimal"
      :input-size="inputSize"
      class="z-20"
      @select="select('Input')"
    />
    <Player
      ref='playerRef'
      :mode="mode"
      :is-selected="isPlayerSelected"
      :is-focused="isPlayerSelected"
      :ticks="timelineTicks"
      :is-minimal="isMinimal"
      :session="session"
      :timetravel="timetravel"
      class="z-10 flex-1"
      @select="selectPlayerMode"
      @finderActivated="onFinderActivated"
    />
    <OutputButton
      :is-selected="mode === 'Output'"
      :is-focused="mode === 'Output'"
      :is-minimal="isMinimal"
      :output-size="outputSize"
      style="z-index: 2"
      @select="select('Output')"
    />
    <ReliabilityButton
      :is-selected="mode === 'Reliability'"
      :is-focused="mode === 'Reliability'"
      :is-minimal="isMinimal"
      style="z-index: 1"
      @select="select('Reliability')"
    />
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import IHeroSessionUpdatedEvent from '@ulixee/desktop-interfaces/events/IHeroSessionUpdatedEvent';
import IDatastoreOutputEvent from '@ulixee/desktop-interfaces/events/IDatastoreOutputEvent';
import { ChevronDownIcon } from '@heroicons/vue/24/outline';
import humanizeBytes from '@/utils/humanizeBytes';
import ISessionTimetravelEvent from '@ulixee/desktop-interfaces/events/ISessionTimetravelEvent';
import ISessionAppModeEvent from '@ulixee/desktop-interfaces/events/ISessionAppModeEvent';
import MenuButton from '../components/MenuButton.vue';
import InputButton from '../components/InputButton.vue';
import Player from '../components/Player.vue';
import OutputButton from '../components/OutputButton.vue';
import ReliabilityButton from '../components/ReliabilityButton.vue';

type IStartLocation = 'currentLocation' | 'sessionStart';

export interface ITimelineTick {
  id: string | number;
  offsetPercent: number;
  class: string;
}

export default Vue.defineComponent({
  name: 'SessionController',
  components: {
    MenuButton,
    InputButton,
    Player,
    OutputButton,
    ReliabilityButton,
    ChevronDownIcon,
  },
  setup() {
    const session = Vue.reactive(createDefaultSession());
    const mode = Vue.ref<ISessionAppModeEvent['mode']>('Live');
    const isPlayerSelected = Vue.computed(() => {
      const value = mode.value;
      return value === 'Live' || value === 'Timetravel' || value === 'Finder';
    });
    const isRestarting = Vue.computed(() => session?.playbackState === 'restarting');

    return {
      session,
      isPlayerSelected,
      isRestarting,
      mode,
      playerRef: Vue.ref<typeof Player>(),
      previousPlayerMode: Vue.ref<ISessionAppModeEvent['mode']>(mode.value),
      isMinimal: Vue.ref(false),
      startLocation: Vue.ref<IStartLocation>('currentLocation'),
      timelineTicks: Vue.ref<any[]>([]),
      outputSize: Vue.ref<string>(humanizeBytes(0)),
      inputSize: Vue.ref<string>(humanizeBytes(0)),
      timetravel: Vue.ref<{ url: string; percentOffset: number }>(null),
    };
  },
  async created() {
    await Client.connect();
  },
  watch: {
    mode(value) {
      if (this.mode === 'Live' || this.mode === 'Timetravel') {
        this.previousPlayerMode = this.mode;
      }
      if (value === 'Finder') {
        this.playerRef.ensureFinderOpen();
      }
    },
  },
  methods: {
    selectPlayerMode(): void {
      this.select(this.previousPlayerMode ?? 'Live');
    },

    select(mode: ISessionAppModeEvent['mode']) {
      const heroSessionId = this.session.heroSessionId;
      if (this.mode === mode) return;
      this.mode = mode;
      if (!heroSessionId) return;
      Client.send('Session.openMode', {
        mode,
      }).catch(err => alert(String(err)));
    },

    onFinderActivated(isToggledOn: boolean): void {
      if (isToggledOn) {
        this.select('Finder');
      } else {
        this.selectPlayerMode();
      }
    },

    onSessionTimetravel(message: ISessionTimetravelEvent) {
      this.timetravel = message;
    },

    onSessionActiveEvent(message: IHeroSessionUpdatedEvent) {
      if (!message) {
        this.outputSize = humanizeBytes(0);
        this.inputSize = humanizeBytes(0);
        this.mode = 'Live';
      }

      message ??= createDefaultSession();
      const isNewId =
        message.heroSessionId !== this.session.heroSessionId || !message.heroSessionId;
      if (isNewId) {
        this.mode = 'Live';
      }
      Object.assign(this.session, message);

      const timelineTicks: ITimelineTick[] = [];
      for (const url of message.timeline.urls) {
        if (url.offsetPercent < 0) continue;
        for (const status of url.loadStatusOffsets) {
          timelineTicks.push({
            id: url.navigationId,
            offsetPercent: status.offsetPercent,
            class: status.loadStatus,
          });
        }
      }

      for (const paintEvent of message.timeline.paintEvents) {
        timelineTicks.push({
          id: 'paintEvent',
          offsetPercent: paintEvent.offsetPercent,
          class: 'paintEvent',
        });
      }

      timelineTicks.sort((a, b) => a.offsetPercent - b.offsetPercent);
      this.timelineTicks = timelineTicks.filter(x => x.offsetPercent);

      this.inputSize = humanizeBytes(message.inputBytes);
    },

    onDatastoreUpdated(message: IDatastoreOutputEvent) {
      this.outputSize = humanizeBytes(message?.bytes);
    },

    onAppModeEvent(message: ISessionAppModeEvent): void {
      const { mode } = message;
      this.mode = mode;
    },
  },

  mounted() {
    Client.on('Session.timetravel', this.onSessionTimetravel);
    Client.on('Session.updated', this.onSessionActiveEvent);
    Client.on('Datastore.output', this.onDatastoreUpdated);
    Client.on('Session.appMode', this.onAppModeEvent);
  },

  beforeUnmount() {
    Client.off('Session.timetravel', this.onSessionTimetravel);
    Client.off('Session.updated', this.onSessionActiveEvent);
    Client.off('Datastore.output', this.onDatastoreUpdated);
    Client.off('Session.appMode', this.onAppModeEvent);
  },
});

function createDefaultSession(): IHeroSessionUpdatedEvent {
  return {
    timeline: { urls: [], paintEvents: [], screenshots: [], storageEvents: [] },
    playbackState: 'paused',
    dbPath: '',
    runtimeMs: 0,
    heroSessionId: '',
    inputBytes: 0,
    startTime: Date.now(),
    scriptEntrypoint: '',
    scriptLastModifiedTime: 0,
  };
}
</script>

<style lang="scss" scoped>
@use 'sass:math';
@import '../variables.scss';

:root {
  --toolbarBackgroundColor: #faf4ff;
}

.bar-wrapper {
  background-color: var(--toolbarBackgroundColor);
  height: 36px;
  cursor: default;
  -webkit-app-region: no-drag;
  &.isRestarting {
    background-color: transparent;
    .MenuButton,
    .InputButton,
    .OutputButton,
    .ReliabilityButton {
      visibility: hidden;
    }
  }
}
</style>
