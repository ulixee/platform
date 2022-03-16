<template>
  <div class="bar-wrapper flex flex-row items-stretch">
    <MenuButton class="z-20" />
    <InputButton
      @select="select('Input')"
      :isSelected="selectedItem === 'Input'"
      :isFocused="selectedItem === 'Input'"
      :isMinimal="isMinimal"
      :inputSize="inputSize"
      class="z-20"
    />
    <Player
      @select="select('Player')"
      :mode="mode"
      :isSelected="selectedItem === 'Player'"
      :isFocused="selectedItem === 'Player'"
      :ticks="timelineTicks"
      :isRunning="isRunning"
      :isMinimal="isMinimal"
      :session="session"
      class="flex-1 z-10"
    />
    <OutputButton
      @select="select('Output')"
      :isSelected="selectedItem === 'Output'"
      :isFocused="selectedItem === 'Output'"
      :isMinimal="isMinimal"
      :outputSize="outputSize"
      style="z-index: 2"
    />
    <ReliabilityButton
      @select="select('Reliability')"
      :isSelected="selectedItem === 'Reliability'"
      :isFocused="selectedItem === 'Reliability'"
      :isMinimal="isMinimal"
      style="z-index: 1"
    />
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import IAppModeEvent from '@ulixee/apps-chromealive-interfaces/events/IAppModeEvent';
import IDataboxOutputEvent from '@ulixee/apps-chromealive-interfaces/events/IDataboxOutputEvent';
import { ChevronDownIcon } from '@heroicons/vue/outline';
import humanizeBytes from '@/utils/humanizeBytes';
import MenuButton from '../components/MenuButton.vue';
import InputButton from '../components/InputButton.vue';
import Player from '../components/Player.vue';
import OutputButton from '../components/OutputButton.vue';
import ReliabilityButton from '../components/ReliabilityButton.vue';

type IStartLocation = 'currentLocation' | 'sessionStart';

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

    return {
      session,
      mode: Vue.ref('Live'),
      isRunning: Vue.ref(false),
      isMinimal: Vue.ref(false),
      startLocation: Vue.ref<IStartLocation>('currentLocation'),
      timelineTicks: Vue.ref<any[]>([]),
      selectedItem: Vue.ref('Player'),
      outputSize: Vue.ref<string>(humanizeBytes(0)),
      inputSize: Vue.ref<string>(humanizeBytes(0)),
    };
  },
  async created() {
    await Client.connect();
  },

  methods: {
    select(item: string) {
      this.selectedItem = item;
      if (item === 'Output' || item === 'Input' || item === 'Reliability') {
        Client.send('Session.openScreen', {
          heroSessionId: this.session.heroSessionId,
          screenName: item,
        });
      } else if (item === 'Player') {
        Client.send('Session.openPlayer');
      }
    },

    onSessionActiveEvent(message: IHeroSessionActiveEvent) {
      if (!message) {
        this.outputSize = humanizeBytes(0);
        this.inputSize = humanizeBytes(0);
        return;
      }

      message ??= createDefaultSession();
      const isNewId =
        message.heroSessionId !== this.session.heroSessionId || !message.heroSessionId;
      Object.assign(this.session, message);

      const timelineTicks: any[] = [];
      for (const url of message.timeline.urls) {
        if (url.offsetPercent < 0) continue;
        timelineTicks.push({
          id: url.navigationId,
          offsetPercent: url.offsetPercent,
          class: url.offsetPercent === 100 ? 'url' : 'urlrequest',
        });
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

      this.isRunning = this.session.playbackState === 'running';
      this.inputSize = humanizeBytes(message.inputBytes);

      this.onAppModeEvent({ mode: message.mode });
    },

    onDataboxUpdated(message: IDataboxOutputEvent) {
      this.outputSize = humanizeBytes(message?.bytes);
    },

    onAppModeEvent(message: IAppModeEvent): void {
      const { mode } = message;
      this.mode = mode;
      if (mode === 'Live' || mode === 'Timetravel') {
        this.selectedItem = 'Player';
      } else {
        this.selectedItem = mode;
      }
    },
  },

  mounted() {
    Client.on('Session.active', this.onSessionActiveEvent);
    Client.on('Databox.output', this.onDataboxUpdated);
    Client.on('App.mode', this.onAppModeEvent);
  },

  beforeUnmount() {
    Client.off('Session.active', this.onSessionActiveEvent);
    Client.off('Databox.output', this.onDataboxUpdated);
    Client.off('App.mode', this.onAppModeEvent);
  },
});

function createDefaultSession(): IHeroSessionActiveEvent {
  return {
    timeline: { urls: [], paintEvents: [], screenshots: [], storageEvents: [] },
    playbackState: 'paused',
    mode: 'Live',
    runtimeMs: 0,
    worldHeroSessionIds: [],
    heroSessionId: '',
    run: 0,
    inputBytes: 0,
    startTime: Date.now(),
    scriptEntrypoint: '',
    scriptLastModifiedTime: 0,
  };
}
</script>

<style lang="scss" scoped>
@use "sass:math";
@import '../variables.scss';

:root {
  --toolbarBackgroundColor: #faf4ff;
}

.bar-wrapper {
  background-color: var(--toolbarBackgroundColor);
  height: 36px;
  cursor: default;
}
</style>
