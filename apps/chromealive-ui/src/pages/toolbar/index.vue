<template>
  <div id="wrapper" ref="toolbarRef">
    <h1>Superhero</h1>

    <ul>
      <li :class="{ focused: mode === 'pagestate' }">
        <img class="icon" src="/icons/circuits.svg" />
        <div class="label">Circuits</div>
        <div class="count">{{ pageStates.length }}</div>
        <ChevronRightIcon class="arrow" />
      </li>

      <li>
        <img class="icon" src="/icons/selectors.svg" />
        <div class="label">Selectors</div>
        <div class="count">5</div>
        <ChevronRightIcon class="arrow" />
      </li>

      <li>
        <img class="icon" src="/icons/worlds.svg" />
        <div class="label">Worlds</div>
        <div class="count">{{ worldSessionIds.size }}</div>
        <ChevronRightIcon class="arrow" />
      </li>

      <li @click.prevent="toggleOutput()">
        <img class="icon" src="/icons/output.svg" />
        <div class="label">Output</div>
        <div class="count">{{ outputSize }}</div>
        <ChevronRightIcon class="arrow" />
      </li>

      <li :class="{ focused: mode === 'timetravel' }">
        <img class="icon" src="/icons/timetravel.svg" />
        <div class="label">Timetravel</div>
        <div class="count">{{ timetravelEvents > 0 ? timetravelEvents : '' }}</div>
        <ChevronRightIcon class="arrow" />
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { ChevronRightIcon } from '@heroicons/vue/solid';
import { IBounds } from '@ulixee/apps-chromealive-interfaces/IBounds';
import Client from '@/api/Client';
import IDataboxUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IDataboxUpdatedEvent';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import IAppModeEvent from '@ulixee/apps-chromealive-interfaces/events/IAppModeEvent';
import humanizeBytes from '@/utils/humanizeBytes';

enum Panel {
  pagestate = 'pagestate',
  output = 'output',
}

const PanelPaths = {
  [Panel.output]: '/databox.html',
  [Panel.pagestate]: '/pagestate-panel.html',
};

export default Vue.defineComponent({
  name: 'Toolbar',
  components: { ChevronRightIcon },
  setup() {
    let toolbarRef = Vue.ref<HTMLDivElement>();
    return {
      toolbarRef,
      pageStates: Vue.ref<IHeroSessionActiveEvent['pageStates']>([]),
      outputSize: Vue.ref<string>(''),
      worldSessionIds: Vue.reactive(new Set<string>()),
      timetravelEvents: Vue.ref<number>(0),
      mode: Vue.ref<IAppModeEvent['mode']>('live'),
      loadedPanelName: Vue.ref<Panel>(),
      panelWindow: null as Window,
      activePageStateId: Vue.ref<string>(),
    };
  },
  methods: {
    isPanelOpen(panel: Panel): boolean {
      return !!this.panelWindow && this.loadedPanelName === panel;
    },
    openPanel(panel: Panel, defaultBounds: Partial<IBounds>): void {
      const toolbarBounds = this.toolbarRef.getBoundingClientRect();
      let bounds = [defaultBounds.width, defaultBounds.height];
      if (localStorage.getItem(`${panel}.lastSize`)) {
        bounds = (localStorage.getItem(`${panel}.lastSize`) ?? '').split(',').map(Number);
      }

      const [width, height] = bounds;
      const top = defaultBounds.top ?? toolbarBounds.top - 50;
      const left = defaultBounds.left ?? toolbarBounds.right + 40;

      const features = [
        `top=${toolbarBounds}`,
        `left=${left}`,
        `width=${width}`,
        `height=${height}`,
      ].join(',');

      const path = PanelPaths[panel];
      if (!this.panelWindow) {
        this.panelWindow = window.open(path, 'ToolbarPanel', features);

        this.panelWindow.addEventListener('resize', this.onPanelResized);
        this.panelWindow.addEventListener('close', this.onPanelClosed);
        this.panelWindow.addEventListener('manual-close', this.onPanelClosed);
      } else {
        this.panelWindow.location.href = path;
        this.panelWindow.moveTo(left, top);
        this.panelWindow.resizeTo(width, height);
      }
      this.loadedPanelName = panel;
    },
    onPanelClosed(): void {
      this.loadedPanelName = null;
      this.panelWindow = null;
    },
    onPanelResized(): void {
      const width = this.panelWindow.innerWidth;
      const height = this.panelWindow.innerHeight;
      localStorage.setItem(`${this.loadedPanelName}.lastSize`, [width, height].join(','));
    },
    toggleOutput(): void {
      if (this.isPanelOpen(Panel.output)) {
        this.panelWindow.close();
      } else {
        this.openPanel(Panel.output, { width: 300, height: 400 });
      }
    },
    closePageState() {
      if (this.isPanelOpen(Panel.pagestate)) {
        this.panelWindow.close();
      }
    },
    openPageState() {
      this.openPanel(Panel.pagestate, { width: 500, height: 400 });
    },
    onSessionActiveEvent(message: IHeroSessionActiveEvent) {
      if (!message) {
        this.timetravelEvents = 0;
        this.pageStates.length = 0;
        this.worldSessionIds.clear();
        this.outputSize = '';
        return;
      }
      this.timetravelEvents = message.timeline.urls.length + message.timeline.paintEvents.length;
      this.pageStates.length = message.pageStates.length;
      Object.assign(this.pageStates, message.pageStates);
      for (const worldHeroSessionId of message.worldHeroSessionIds) {
        this.worldSessionIds.add(worldHeroSessionId);
      }
    },
    onDataboxUpdated(message: IDataboxUpdatedEvent) {
      this.outputSize = humanizeBytes(message?.bytes);
    },
    onAppModeEvent(message: IAppModeEvent): void {
      const startingMode = this.mode;
      this.mode = message.mode;

      if (this.mode === 'live') {
        if (startingMode === 'pagestate') {
          this.closePageState();
        }
      } else if (this.mode === 'pagestate') {
        this.openPageState();
      }
    },
  },
  async created() {
    await Client.connect();
  },

  mounted() {
    Client.on('Session.active', this.onSessionActiveEvent);
    Client.on('Databox.updated', this.onDataboxUpdated);
    Client.on('App.mode', this.onAppModeEvent);
  },
});
</script>

<style lang="scss">
#wrapper {
  background: #faf4ff;
  border: 1px solid rgba(0, 0, 0, 0.3);
  box-shadow: 1px 1px 5px 3px rgba(0, 0, 0, 0.1);
  border-radius: 0 5px 5px 0;
}
#app {
  display: flex;
}
h1 {
  @apply font-bold py-3 px-2 select-none;
  -webkit-app-region: drag;
}
li {
  @apply flex flex-row border-t py-3 pl-3 pr-2 text-sm cursor-pointer;
  text-shadow: 1px 1px 0 white;
  &.focused {
    @apply bg-purple-200
  }
  &:hover {
    @apply bg-purple-100;
  }
  .icon {
    @apply w-5 mr-2;
  }
  .label {
    @apply flex-1;
    max-width: 150px;
  }
  .count {
    @apply ml-4;
    opacity: 0.4;
  }
  .arrow {
    @apply w-4 ml-2;
  }
}
</style>
