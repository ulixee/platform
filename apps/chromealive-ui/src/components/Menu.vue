<template>
  <div id="bar-menu" :style="{ display: show ? 'block' : 'none' }">
    <div class="wrapper">
      <ul class="menu-items">
        <li class="databox-toggle" @click.prevent="toggleDatabox(true)">
          {{ databoxWindow !== null ? 'Hide' : 'Show' }} Databox Panel
        </li>
        <li class="rerun-script" @click.prevent="restartScript()">Rerun script from beginning</li>
        <li class="quit-script" @click.prevent="quitScript()">Shutdown Chrome + Script</li>
        <li class="divider"></li>
        <li class="about" @click.prevent="showAbout()">About ChromeAlive!</li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { defineComponent, PropType } from 'vue';
import Client from '@/api/Client';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';

export default defineComponent({
  name: 'Menu',
  components: {},
  props: {
    show: Boolean,
    toolbarRect: {
      type: Function as PropType<() => DOMRect>,
    },
    session: {
      type: Object as PropType<IHeroSessionActiveEvent>,
    },
  },
  setup() {
    return {
      databoxWindow: Vue.ref<Window>(null),
      hasLaunchedDatabox: false,
    };
  },
  watch: {
    'session.heroSessionId'(newSessionId: string) {
      if (!newSessionId) {
        this.closeDataboxWindow();
        return;
      }

      const wasDataboxClosed = localStorage.getItem('databox.wasClosed') === 'true';
      if (wasDataboxClosed) return;
      this.openDataboxWindow();
    },
    'session.needsPageStateResolution'(needsResolution: boolean) {
      if (needsResolution) {
        this.closeDataboxWindow();
      }
    },
  },
  emits: ['navigated'],
  methods: {
    quitScript() {
      Client.send('Session.quit', {
        heroSessionId: this.session.heroSessionId,
      });
    },

    showAbout(): void {
      this.$emit('navigated');
      console.log(
        'ChromeAlive! is your live interface for controlling Ulixee Databoxes using the Hero web scraper',
      );
    },

    restartScript() {
      Client.send('Session.resume', {
        heroSessionId: this.session.heroSessionId,
        startLocation: 'sessionStart',
      });
    },

    closeDataboxWindow(isManual = false) {
      if (this.databoxWindow) {
        this.$emit('navigated');
        if (isManual) localStorage.setItem('databox.wasClosed', `true`);
        this.databoxWindow.close();
        this.databoxWindow = null;
      }
    },

    openDataboxWindow() {
      if (!this.databoxWindow) return;

      this.$emit('navigated');
      this.hasLaunchedDatabox = true;

      const { bottom, right } = this.toolbarRect();
      const [width, height] = (localStorage.getItem('databox.lastSize') ?? '300,400')
        .split(',')
        .map(Number);
      const features = `top=${bottom + 100},left=${
        right - width - 40
      },width=${width},height=${height}`;
      this.databoxWindow = window.open('/databox.html', 'DataboxPanel', features);
      localStorage.setItem('databox.wasClosed', 'false');

      this.databoxWindow.addEventListener('resize', ev => {
        const width = this.databoxWindow.innerWidth;
        const height = this.databoxWindow.innerHeight;
        localStorage.setItem('databox.lastSize', [width, height].join(','));
      });
      this.databoxWindow.addEventListener('close', () => {
        this.databoxWindow = null;
      });
      this.databoxWindow.addEventListener('manual-close', () => {
        this.databoxWindow = null;
      });
    },

    toggleDatabox(isManual = false) {
      if (this.databoxWindow) {
        this.closeDataboxWindow(isManual);
      } else {
        this.openDataboxWindow();
      }
    },
  },
});
</script>

<style lang="scss">
@import '../assets/style/resets';

#bar-menu {
  display: none;
  width: 300px;
  position: relative;
  top: 0;
  padding-bottom: 6px;
  .wrapper {
    padding: 8px 0;
    background: var(--toolbarBackgroundColor);
    border-radius: 0 0 5px 5px;
    overflow: hidden;
    box-shadow: 1px 3px 5px rgba(0, 0, 0, 0.3);
    transition: opacity 0.3s, transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);

    ul {
      margin: 0;
      padding: 0;

      li {
        cursor: pointer;
        list-style: none;
        text-align: left;
        font-size: 15px;
        padding: 5px 10px;
        margin: 0 5px;
        line-height: 20px;

        &:hover {
          background: var(--toolbarBackgroundColor);
        }

        &.divider {
          height: 1px;
          background: #3c3c3c;
          padding: 0;
          margin: 10px 0;
        }
      }
    }
  }
}
</style>
