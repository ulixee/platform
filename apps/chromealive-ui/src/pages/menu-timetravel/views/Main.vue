<template>
  <div class="Menu bg-white rounded">
    <div class="arrow-up"></div>
    <ul class="whitespace-nowrap">
      <li class="item">Jump Forward to Live Mode</li>
      <li class="item">Replay</li>
      <li class="item">Rerun in Live Mode</li>
      <li class="separator bg-gray-200"></li>
      <li class="item">About ChromeAlive!</li>
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
  @use "sass:math";

  .Menu {
    top: 0;
    border: 1px solid rgba(0,0,0,0.25);
    border-radius: 7px;
    box-shadow: 1px 1px 10px 1px rgba(0,0,0,0.3);
    ul {
      text-align: left;
      padding: 5px 1px 3px;
      li {
        &.item {
          padding: 6px 14px 6px 20px;
          border-radius: 5px;
          &:hover {
            background: #FAF4FF;
          }
        }
        &.separator {
          margin: 3px 0;
          height: 1px;
        }
      }
    }
  }

  $arrowUpSize: 20;
  .arrow-up {
    width: #{$arrowUpSize}px;
    height: #{$arrowUpSize}px;
    overflow: hidden;
    position: absolute;
    top: -19px;
    left: 10px;
    pointer-events: none;

    &::before {
      content: '';
      display: block;
      width:  math.div($arrowUpSize, 1.41) * 1px;
      height: math.div($arrowUpSize, 1.41) * 1px;
      position: absolute;
      bottom: 0;
      left: -0.5px;
      @apply bg-gray-100;
      border: 1px solid rgba(0,0,0,0.25);
      box-shadow: 1px 1px 5px 1px rgba(0,0,0,0.3);
      transform: rotate(45deg);
      transform-origin: 0 100%;
    }
  }
</style>
