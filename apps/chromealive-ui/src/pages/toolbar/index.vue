<template>
  <div class="shadow-top"></div>
  <div class="shadow-middle"></div>
  <div class="shadow-bottom"></div>
  <div id="toolbar-box">
    <Header :section="sections[activeSectionId]" :isMinimized="isMinimized" />
    <Main v-if="!activeSectionId" :sections="sections" :isMinimized="isMinimized" :hasOpenPanel="hasOpenPanel" />
    <Circuits v-else-if="activeSectionId === sections.circuits.id" />
    <Selectors v-else-if="activeSectionId === sections.selectors.id" />
    <Worlds v-else-if="activeSectionId === sections.worlds.id" />
    <Output v-else-if="activeSectionId === sections.output.id" />
    <Vitals v-else-if="activeSectionId === sections.vitals.id" />
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import Header from './components/Header.vue';
import Main from './views/Main.vue';
import Circuits from './views/Circuits.vue';
import Selectors from './views/Selectors.vue';
import Worlds from './views/Worlds.vue';
import Output from './views/Output.vue';
import Vitals from './views/Vitals.vue';
import emitter from './emitter';
import IAppModeEvent from '../../../../chromealive-interfaces/events/IAppModeEvent';
import { IBounds } from '../../../../chromealive-interfaces/IBounds';

const sections = [
  {
    id: 'circuits',
    title: 'Circuits',
    icon: '/icons/circuits.svg',
  }, {
    id: 'selectors',
    title: 'Selectors',
    icon: '/icons/selectors.svg',
  }, {
    id: 'worlds',
    title: 'Worlds',
    icon: '/icons/worlds.svg',
  }, {
    id: 'output',
    title: 'Output',
    icon: '/icons/output.svg',
  }, {
    id: 'timetravel',
    title: 'Timetravel',
    icon: '/icons/timetravel.svg',
  }, {
    id: 'vitals',
    title: 'Health Vitals',
    icon: '/icons/vitals.svg',
  },
]

enum Panel {
  pagestate = 'pagestate',
  output = 'output',
}

const PanelPaths = {
  [Panel.output]: '/databox.html',
  [Panel.pagestate]: '/popup-panel.html',
};

export default Vue.defineComponent({
  name: 'Toolbar',
  components: { Header, Main, Circuits, Selectors, Worlds, Output, Vitals },
  setup() {
    return {
      isMinimized: Vue.ref(false),
      activeSectionId: Vue.ref(),
      sections: sections.reduce((obj, x) => Object.assign(obj, { [x.id]: x }), {}),
      hasOpenPanel: Vue.ref(false),

      mode: Vue.ref<'live' | 'pagestate' | 'timetravel'>('live'),
      loadedPanelName: Vue.ref<Panel>(),
      panelWindow: null as Window,
      activePageStateId: Vue.ref<string>(),
    };
  },
  methods: {
    onAppModeEvent(message: IAppModeEvent): void {
      const startingMode = this.mode;
      this.mode = message.mode;

      if (this.mode === 'live') {
        if (startingMode === 'pagestate') {
          this.closeCircuitPanel();
        }
      } else if (this.mode === 'pagestate') {
        this.openCircuitPanel();
      }
    },

    isPanelOpen(panel: Panel): boolean {
      return !!this.panelWindow && this.loadedPanelName === panel;
    },

    openPanel(panel: Panel, defaultBounds: Partial<IBounds>): void {
      let bounds = [defaultBounds.width, defaultBounds.height];
      if (localStorage.getItem(`${panel}.lastSize`)) {
        bounds = (localStorage.getItem(`${panel}.lastSize`) ?? '').split(',').map(Number);
      }

      const [width, height] = bounds;
      const left = 36;

      const features = [
        `offsetX=${left}`,
        `width=${width}`,
        `height=${height}`,
      ].join(',');

      const path = PanelPaths[panel];
      if (!this.panelWindow) {
        this.panelWindow = window.open(path, 'PopupPanel', features);
        this.panelWindow.addEventListener('close', this.onPanelClosed);
        this.panelWindow.addEventListener('manual-close', this.onPanelClosed);
      } else {
        this.panelWindow.location.href = path;
      }
      this.loadedPanelName = panel;
    },

    onPanelClosed(): void {
      this.loadedPanelName = null;
      this.panelWindow = null;
    },

    closeCircuitPanel() {
      if (this.isPanelOpen(Panel.pagestate)) {
        this.panelWindow.close();
      }
    },

    openCircuitPanel() {
      this.openPanel(Panel.pagestate, { width: 500, height: 400 });
    },
  },

  async created() {
    await Client.connect();
  },

  mounted() {
    emitter.on('showMain', () => this.activeSectionId = null);
    emitter.on('showSection', (id) => this.activeSectionId = id);
    emitter.on('toggleMinimized', () => {
      this.isMinimized = !this.isMinimized;
      emitter.emit('resizeWidth', this.isMinimized ? 'minimized' : 'maximized');
    });
    emitter.on('openCircuitPanel', () => this.openCircuitPanel());
    emitter.on('openTimetravelMode', () => {});
    emitter.on('resizeWidth', width => {
      document.dispatchEvent(new CustomEvent('toolbar:resize-width', { detail: { width } }));
    });
    emitter.on('closePopupAlert', () => {
      document.dispatchEvent(new CustomEvent('toolbar:closePopupAlert', { detail: 'PopupAlert' }));
      console.log('SENT MESSAGE alert');
    });
    emitter.on('setAlertContentHeight', height => {
      document.dispatchEvent(new CustomEvent('toolbar:setAlertContentHeight', { detail: { height } }));
    })
    Client.on('App.mode', this.onAppModeEvent);
  },
});
</script>

<style lang="scss">
:root {
  --toolbarBorderColor: rgba(0, 0, 0, 0.3);
  --toolbarBackgroundColor: #faf4ff;
  --toolbarBorder:  1px solid rgba(0, 0, 0, 0.3);
  --toolbarBorderRadius: 5px;
  --toolbarBoxShadow: 1px 1px 5px 3px rgba(0, 0, 0, 0.1);
}

#app {
  width: 100%;
  height: 100%;
}

.shadow-top {
  height: 25%;
  width: 100%;
  position: absolute;
  overflow: hidden;
  top: 0;
  left: 0;
  z-index: 1;
  &:before {
    content: '';
    background: var(--toolbarBackgroundColor);
    border: 1px solid transparent;
    border-radius: var(--toolbarBorderRadius);
    box-shadow: var(--toolbarBoxShadow);
    margin: 8px 9px 9px 8px;
    position: absolute;
    left: 0;
    top: 0;
    width: calc(100% - 17px);
    height: 100%;
  }
}

.shadow-middle {
  height: 25%;
  width: 100%;
  position: absolute;
  overflow: hidden;
  top: 25%;
  left: 0;
  z-index: 1;
  &:before {
    content: '';
    background: var(--toolbarBackgroundColor);
    border: 1px solid transparent;
    border-radius: var(--toolbarBorderRadius);
    box-shadow: var(--toolbarBoxShadow);
    margin: 0 9px 0 8px;
    position: absolute;
    left: 0;
    top: -5px;
    width: calc(100% - 17px);
    height: calc(100% + 10px);
  }
}

.shadow-bottom {
  height: 50%;
  width: 100%;
  position: absolute;
  overflow: hidden;
  bottom: 0;
  left: 0;
  z-index: 1;
  &:before {
    content: '';
    background: var(--toolbarBackgroundColor);
    border: 1px solid transparent;
    border-radius: var(--toolbarBorderRadius);
    box-shadow: var(--toolbarBoxShadow);
    margin: 8px 9px 9px 8px;
    position: absolute;
    left: 0;
    bottom: 0;
    width: calc(100% - 17px);
    height: 100%;
  }
}

#toolbar-box {
  position: relative;
  z-index: 2;
  background: var(--toolbarBackgroundColor);
  border: var(--toolbarBorder);
  border-radius: var(--toolbarBorderRadius);
  margin: 8px 9px 9px 8px;
  height: calc(100% - 17px);
  width: calc(100% - 17px);
}

body.docked.left {
  #toolbar-box {
    border-left: none;
    border-radius: 0 var(--toolbarBorderRadius) var(--toolbarBorderRadius) 0;
    margin-left: 0;
    width: calc(100% - 9px);
  }
}

body.docked.right {
  #toolbar-box {
    border-right: none;
    border-radius: var(--toolbarBorderRadius) 0 0 var(--toolbarBorderRadius);
    margin-right: 0;
    width: calc(100% - 8px);
  }
}

</style>
