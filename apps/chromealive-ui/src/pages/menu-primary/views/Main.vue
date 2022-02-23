<template>
  <div class="Menu">
    <ul >
      <li class="info">
        Chrome is bound to <strong>{{session?.scriptEntrypoint || 'unknown script'}}</strong>, a <strong>Hero</strong>
        script wrapped as a <strong>Databox</strong>.</li>
      <li class="separator"></li>
      <li class="item">Continue Script Execution</li>
      <li class="item">Replay from Beginning of Script</li>
      <li class="separator"></li>
      <li class="item-wrapper flex flex-row">
        <div class="flex-1">Open In Finder</div>
        <div class="item">Executed JS</div>
        <div class="item">Source TS</div>
      </li>
      <li class="separator"></li>
      <li class="item">About Ulixee</li>
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
    background: white;
    padding: 0 1px;
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
          white-space: nowrap;
          padding: 6px 14px 6px 20px;
          border-radius: 5px;
          &:hover {
            background: #FAF4FF;
          }
        }
        &.separator {
          margin: 3px 0;
          height: 1px;
          @apply bg-gray-200;
        }
        &.item-wrapper {
          white-space: nowrap;
          div {
            padding: 6px 14px 6px 20px;
          }
          .item {
            padding: 6px 16px;
            @apply border-l border-gray-200;
            &:hover {
              background: #FAF4FF;
            }
          }
        }
      }
    }
  }
</style>
