<template>
  <div class="Menu bg-white">
    <ul>
      <li
        v-for="url of urls"
        :key="url.url"
        class="item"
        @click.prevent="navigateToOffset(url.offsetPercent)"
      >
        {{ url.url }}
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { defineComponent } from 'vue';
import Client from '@/api/Client';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import { LoadStatus } from '@unblocked-web/emulator-spec/Location';

export default defineComponent({
  name: 'Menu',
  components: {},
  setup() {
    return {
      urls: Vue.ref<{ url: string; offsetPercent: number }[]>([]),
      heroSessionId: Vue.ref<string>(null),
    };
  },
  mounted() {
    Client.on('Session.active', this.onSessionActiveEvent);
  },
  unmounted() {
    Client.off('Session.active', this.onSessionActiveEvent);
  },
  methods: {
    navigateToOffset(offset: number) {
      void Client.send('Session.timetravel', {
        heroSessionId: this.heroSessionId,
        percentOffset: offset,
      });
      window.blur();
    },
    onSessionActiveEvent(message: IHeroSessionActiveEvent) {
      if (!message) {
        this.urls.length = 0;
        this.heroSessionId = '';
        return;
      }
      this.urls.length = 0;
      for (const url of message.timeline.urls) {
        if (!url.navigationId) continue;
        const offsetPercent =
          url.loadStatusOffsets.find(x => x.loadStatus === LoadStatus.JavascriptReady)
            ?.offsetPercent ?? url.offsetPercent;

        this.urls.push({ url: url.url, offsetPercent });
      }
      this.heroSessionId = message.heroSessionId;
    },
  },
});
</script>

<style lang="scss" scoped="scoped">
.Menu {
  margin: 9px 11px 11px 9px;
  border: 1px solid rgba(0, 0, 0, 0.25);
  border-radius: 7px;
  box-shadow: 1px 1px 10px 1px rgba(0, 0, 0, 0.3);
  overflow-y: auto;
  overflow-x: hidden;
  ul {
    text-align: left;
    padding: 5px 1px 3px;
    margin-right: 15px;
    text-overflow: fade;
    li {
      &.info {
        padding: 6px 14px 6px 20px;
        font-style: italic;
        opacity: 0.6;
      }
      &.item {
        padding: 6px 14px 6px 20px;
        border-radius: 5px;
        white-space: nowrap;
        &:hover {
          background: #faf4ff;
        }
      }
      &.separator {
        @apply bg-gray-200;
        margin: 3px 0;
        height: 1px;
      }
    }
  }
}
</style>
