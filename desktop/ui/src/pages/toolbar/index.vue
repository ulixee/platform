<template>
  <div class="relative">
    <span
      class="mt-2 l-0 r-0 w-full absolute mx-auto text-center font-semibold text-md text-slate-600"
    >{{ title }}</span>
    <div id="ChromeAliveToolbar" :class="{ loading: isLoading, restarting: isRestarting }">
      <SessionController />
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import SessionController from '@/pages/toolbar/views/SessionController.vue';

export default Vue.defineComponent({
  name: 'App',
  components: {
    SessionController,
  },
  setup() {
    return {
      title: Vue.ref<string>(''),
      isLoading: Vue.ref(false),
      isRestarting: Vue.ref(false),
    };
  },

  async created() {
    await Client.connect();
  },

  mounted() {
    document.title = 'ChromeAlive!';
    Client.on('Session.loading', () => {
      this.isLoading = true;
    });
    Client.on('Session.updated', session => {
      this.title = document.title;
      this.isRestarting = session?.playbackState === 'restarting';
    });
    Client.on('Session.loaded', () => {
      this.isLoading = false;
    });
  },
});
</script>

<style lang="scss">
html {
  padding: 0;
  margin: 0;
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont;
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

* {
  user-select: none;
  &:focus-visible {
    outline: none;
  }
}

#ChromeAliveToolbar {
  overflow-y: visible;
  -webkit-app-region: drag;
  vertical-align: top;
  color: rgba(0, 0, 0, 0.8);
  box-sizing: border-box;
  padding: 35px 10px 15px;
  min-height: 36px;
  box-shadow:
    0 0 1px rgba(0, 0, 0, 0.12),
    0 1px 1px rgba(0, 0, 0, 0.16);
  border-bottom: 1px solid rgba(0, 0, 0, 0.2);
  background: white;

  &.restarting {
    background: transparent;
    opacity: 1;
    border: none;
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
</style>
