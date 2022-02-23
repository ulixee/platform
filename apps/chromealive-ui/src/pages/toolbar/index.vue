<template>
  <div id="ChromeAliveToolbar" :class="{ loading: isLoading }">
    <SessionController></SessionController>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import SessionController from '@/pages/toolbar/views/SessionController.vue';

export default Vue.defineComponent({
  name: 'App',
  components: {
    SessionController
  },
  setup() {

    return {
      isLoading: Vue.ref(false),
    };
  },

  async created() {
    await Client.connect();
  },

  mounted() {
    Client.on('Session.loading', () => {
      this.isLoading = true;
    });
    Client.on('Session.loaded', () => {
      this.isLoading = false
    });
  },
});
</script>

<style lang="scss">
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
  height: 36px;
  background: white;

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
</style>
