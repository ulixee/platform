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
      v-if="!showFocusedTimeline"
      ref="liveView"
      @open-generator="openGenerator"
    ></Live>

    <FocusedTimeline
      v-else
      ref="focusedTimlineRef"
      :dom-state-id="domStateId"
      @exit="exitGenerator()"
    ></FocusedTimeline>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import Live from '@/pages/timeline/views/Live.vue';
import FocusedTimeline from '@/pages/timeline/views/FocusedTimeline.vue';
import { IBounds } from '@ulixee/apps-chromealive-interfaces/IBounds';

export default Vue.defineComponent({
  name: 'App',
  components: { Live, FocusedTimeline },
  setup() {
    let lastToolbarBounds: IBounds;
    let liveView = Vue.ref<typeof Live>();
    let focusedTimlineRef = Vue.ref<typeof FocusedTimeline>();

    return {
      lastToolbarBounds,
      liveView,
      focusedTimlineRef,
      appDiv: Vue.ref<HTMLDivElement>(),
      isDragging: Vue.computed(() => liveView.value?.isDragging || focusedTimlineRef.value?.isDragging),
      isLoading: Vue.ref(false),
      showFocusedTimeline: Vue.ref(false),
      domStateId: Vue.ref<string>(null),
    };
  },
  methods: {
    exitGenerator() {
      this.showFocusedTimeline = false;
      this.domStateId = null;
    },

    openGenerator(domStateId: string) {
      this.showFocusedTimeline = true;
      this.domStateId = domStateId;
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
      this.showFocusedTimeline = false;
    });
    Client.on('App.mode', message => {
      const { mode } = message;
      this.showFocusedTimeline = mode === 'domstate';
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
  overflow: hidden;
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
    cursor: pointer;
    width: 14px;
    height: 14px;
  }
  div, span, label {
    cursor: pointer;
  }
}
</style>
