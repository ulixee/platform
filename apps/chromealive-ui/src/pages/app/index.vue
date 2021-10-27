<template>
  <div
    id="ChromeAlivePage"
    :class="{
      dragging: isDragging,
      loading: isLoading,
    }"
    ref="appDiv"
  >
    <Live
      v-if="showLiveView"
      ref="liveView"
      @bounds-changed="sendBoundsChanged($event, 'live')"
      @open-generator="openGenerator"
    ></Live>

    <PageStateGenerator
      v-else
      ref="generatorView"
      :page-state-id="pageStateId"
      @bounds-changed="sendBoundsChanged($event, 'generator')"
      @exit="exitGenerator()"
    ></PageStateGenerator>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import Live from '@/pages/app/views/Live.vue';
import PageStateGenerator from '@/pages/app/views/PageStateGenerator.vue';
import { IBounds } from '@ulixee/apps-chromealive-interfaces/IBounds';

export default Vue.defineComponent({
  name: 'App',
  components: { Live, PageStateGenerator },
  setup() {
    let lastToolbarBounds: IBounds;
    let liveView = Vue.ref<typeof Live>();
    let generatorView = Vue.ref<typeof PageStateGenerator>();

    return {
      lastToolbarBounds,
      liveView,
      generatorView,
      appDiv: Vue.ref<HTMLDivElement>(),
      isDragging: Vue.computed(() => liveView.value?.isDragging || generatorView.value?.isDragging),
      isLoading: Vue.ref(false),
      showLiveView: Vue.ref(true),
      pageStateId: Vue.ref<string>(null),
    };
  },
  methods: {
    exitGenerator() {
      this.showLiveView = true;
      this.pageStateId = null;
    },

    openGenerator(pageStateId: string) {
      this.showLiveView = false;
      this.pageStateId = pageStateId;
    },

    async sendBoundsChanged(toolbar: HTMLElement, page: string) {
      const bounds = {
        height: toolbar.offsetHeight,
        width: toolbar.offsetWidth,
        left: window.screenLeft,
        top: window.screenTop,
      };
      if (
        bounds.height === this.lastToolbarBounds?.height &&
        bounds.width === this.lastToolbarBounds?.width
      ) {
        return;
      }
      this.lastToolbarBounds = bounds;

      await Client.connect();
      await Client.send('App.boundsChanged', {
        bounds,
        page
      });
    },

    async sendAppHeightChanged() {
      const elem = this.appDiv;
      document.dispatchEvent(
        new CustomEvent('app:height-changed', {
          detail: {
            height: elem.offsetHeight,
          },
        }),
      );
    },
  },

  async created() {
    await Client.connect();
    Client.onConnect = () => this.sendAppHeightChanged();
  },

  mounted() {
    Client.on('Session.loading', () => {
      this.isLoading = true;
      this.showLiveView = true;
    });
    Client.on('App.mode', mode => {
      this.showLiveView = mode === 'live';
    });
    Client.on('Session.loaded', () => (this.isLoading = false));
    new ResizeObserver(() => this.sendAppHeightChanged()).observe(this.appDiv);
  },
});
</script>

<style lang="scss">
@import '../../assets/style/resets.scss';

html {
  padding: 0;
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont;
  font-size: 13px;
  &::-webkit-scrollbar {
    display: none;
  }
}

body {
  padding: 0;
  margin: 0;
}

#ChromeAlivePage {
  overflow-y: visible;
  -webkit-app-region: drag;
  vertical-align: top;
  color: rgba(0, 0, 0, 0.8);
  box-sizing: border-box;
  &::-webkit-scrollbar {
    display: none;
  }
  &.dragging * {
    user-select: none;
  }

  &.loading > * {
    opacity: 0.5;
    border: 1px solid #3c3c3c;
  }
}

.icon {
  width: 20px;
  height: 20px;
  display: inline-block;
  will-change: background-image;
  transition: 0.15s background-image;
  backface-visibility: hidden;
  background-size: contain;
  background-repeat: no-repeat;
}

.app-button {
  cursor: pointer;
  position: relative;
  transition: 0.2s background-color;
  backface-visibility: hidden;
  margin: 0 5px;
  background-color: transparent;
  border-radius: 4px;
  border-width: 1px;
  padding: 2px 5px;

  &:disabled {
    -webkit-app-region: drag;
    pointer-events: none;
    .icon {
      filter: invert(50%);
    }
  }
  .icon {
    width: 14px;
    height: 14px;
  }
}
</style>
