<template>
  <div class="bar-wrapper flex flex-row items-stretch">
    <!-- <Titlebar :session="session" :isTimetravelMode="isTimetravelMode" /> -->
    <AddressField
      @toggle="toggleAddress"
      :isActive="activeItem === 'Address'"
      :session="session"
      :style="{ width: activeItem === 'Address' ? '40%' : '20%' }"
    />
    <div class="ulixee-tools flex-1 flex flex-row items-stretch">
      <InputButton
        @select="select('Input')"
        :isSelected="selectedItem === 'Input'"
        :isActive="activeItem === 'Input'"
        :isMinimal="isMinimal"
        class="z-20"
      />
      <Player
        @select="select('Player')"
        :isSelected="selectedItem === 'Player'"
        :isActive="activeItem === 'Player'"
        :ticks="timelineTicks"
        :isRunning="isRunning"
        :isMinimal="isMinimal"
        :session="session"
        class="flex-1 z-10"
      />
      <OutputButton
        @select="select('Output')"
        :isSelected="selectedItem === 'Output'"
        :isActive="activeItem === 'Output'"
        :isMinimal="isMinimal"
        :outputSize="outputSize"
        style="z-index: 2"
      />
      <TestedButton
        @select="select('Tested')"
        :isSelected="selectedItem === 'Tested'"
        :isActive="activeItem === 'Tested'"
        :isMinimal="isMinimal"
        style="z-index: 1"
      />
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import IAppModeEvent from '@ulixee/apps-chromealive-interfaces/events/IAppModeEvent';
import IDataboxUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IDataboxUpdatedEvent';
import { ChevronDownIcon } from '@heroicons/vue/outline';
import humanizeBytes from '@/utils/humanizeBytes';
import InputButton from '../components/InputButton.vue';
import Player from '../components/Player.vue';
import OutputButton from '../components/OutputButton.vue';
import TestedButton from '../components/TestedButton.vue';
import AddressField from '../components/AddressField.vue';

type IStartLocation = 'currentLocation' | 'sessionStart';

export default Vue.defineComponent({
  name: 'SessionController',
  components: {
    InputButton,
    Player,
    OutputButton,
    TestedButton,
    AddressField,
    ChevronDownIcon,
  },
  setup() {
    const session = Vue.reactive(createDefaultSession());

    return {
      session,
      isTimetravelMode: Vue.ref(false),
      isRunning: Vue.ref(false),
      isMinimal: Vue.ref(false),
      startLocation: Vue.ref<IStartLocation>('currentLocation'),
      timelineTicks: Vue.ref<any[]>([]),
      activeItem: Vue.ref('Player'),
      selectedItem: Vue.ref('Player'),
      outputSize: Vue.ref<string>(''),
    };
  },
  async created() {
    await Client.connect();
  },

  methods: {
    select(item: string) {
      this.selectedItem = item;
      this.activeItem = item;
      if (item === 'Output' || item === 'Input' || item === 'Tested') {
        Client.send('Session.openPanel', {
          heroSessionId: this.session.heroSessionId,
          panel: item,
        });
      }
    },

    toggleAddress() {
      if (this.activeItem === 'Address') {
        this.activeItem = this.selectedItem;
      } else {
        this.activeItem = 'Address';
      }
    },

    onSessionActiveEvent(message: IHeroSessionActiveEvent) {
      if (!message) {
        this.outputSize = '';
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

      this.onAppModeEvent({ mode: message.mode });

      //   if (isNewId || !this.isTimetravelMode) {
      //     this.timelineOffset = 100;
      //   }
    },

    onDataboxUpdated(message: IDataboxUpdatedEvent) {
      this.outputSize = humanizeBytes(message?.bytes);
    },

    onAppModeEvent(message: IAppModeEvent): void {
      this.isTimetravelMode = message.mode === 'timetravel';
      if (message.mode === 'live') {
        // this.timelineOffset = 100;
        // this.clearPendingTimetravel();
      }
    },
  },

  mounted() {
    Client.on('Session.active', this.onSessionActiveEvent);
    Client.on('Databox.updated', this.onDataboxUpdated);
    Client.on('App.mode', this.onAppModeEvent);
  },

  beforeUnmount() {
    Client.off('Session.active', this.onSessionActiveEvent);
    Client.off('Databox.updated', this.onDataboxUpdated);
    Client.off('App.mode', this.onAppModeEvent);
  },
});

function createDefaultSession(): IHeroSessionActiveEvent {
  return {
    timeline: { urls: [], paintEvents: [], screenshots: [], storageEvents: [] },
    playbackState: 'paused',
    mode: 'live',
    runtimeMs: 0,
    worldHeroSessionIds: [],
    heroSessionId: '',
    run: 0,
    domStates: [],
    hasWarning: false,
    scriptEntrypoint: '',
    scriptLastModifiedTime: 0,
  };
}
</script>

<style lang="scss" scoped>
:root {
  --toolbarBackgroundColor: #faf4ff;
}

.bar-wrapper {
  background-color: var(--toolbarBackgroundColor);
  padding-left: 8px;
  height: 36px;
  cursor: default;
}

.ulixee-tools {
  margin-left: 2px;
}
</style>
