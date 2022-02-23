<template>
  <div class="Menu bg-white">
    <ul>
      <li class="info">You are currently in TimeTravel, at 1.2s from start of script.</li>
      <li class="separator"></li>
      <li class="item">Jump Forward to Live Mode</li>
      <li class="separator"></li>
      <li class="item">About Ulixee's TimeTravel</li>
    </ul>
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

    openAbout() {
      Client.send('Navigation.openAbout');
    },
  },
});
</script>

<style lang="scss" scoped="scoped">
  .Menu {
    margin: 9px 11px 11px 9px;
    border: 1px solid rgba(0,0,0,0.25);
    border-radius: 7px;
    box-shadow: 1px 1px 10px 1px rgba(0,0,0,0.3);
    ul {
      text-align: left;
      padding: 5px 1px 3px;
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
            background: #FAF4FF;
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
