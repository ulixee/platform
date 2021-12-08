<template>
  <div id="bar-menu" :style="{ display: show ? 'block' : 'none' }">
    <div class="wrapper">
      <ul class="menu-items">
        <li class="rerun-script" @click.prevent="restartScript()">Rerun script from beginning</li>
        <li class="quit-script" @click.prevent="quitScript()">Shutdown Chrome + Script</li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
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
  emits: ['navigated'],
  methods: {
    quitScript() {
      Client.send('Session.quit', {
        heroSessionId: this.session.heroSessionId,
      });
    },

    restartScript() {
      Client.send('Session.resume', {
        heroSessionId: this.session.heroSessionId,
        startLocation: 'sessionStart',
      });
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
