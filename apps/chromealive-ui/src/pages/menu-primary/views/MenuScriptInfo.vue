<template>
  <div class="MenuScriptInfo bg-white rounded">
    <div class="arrow-up"></div>
<!--    <div class="text" :class="{ hasMenu: isShowingMenu }">-->
<!--      <span>Chrome is {{ isTimetravelMode ? 'replaying ' : 'bound to ' }}</span>-->
<!--      <i class="filename">{{ session.scriptEntrypoint || 'unknown script' }}</i>-->
<!--    </div>-->
    <ul class="whitespace-nowrap pt-4 pb-1 font-light">
      <li class="item py-2">Script last ran 1 minute ago</li>
      <li class="item pb-4">Script is wrapped as a Databox</li>
      <li class="separator bg-gray-200 mt-3"></li>
      <li class="item script py-5">
        <div class="title mb-2"><strong class="font-bold text-gray-600">Executed Script</strong> created 45d ago</div>
        <div class="path whitespace-normal break-words font-mono text-gray-500 italic">
          /Users/calebclark/Projects/DLF/kitihawk/build/sites/test.js
          <img src="@/assets/icons/external.svg" class="icon w-4" />
        </div>
      </li>
      <li class="separator bg-gray-200"></li>
      <li class="item script py-5">
        <div class="title mb-2"><strong class="font-bold text-gray-600">Source Script</strong> created 45d ago</div>
        <div class="path whitespace-normal break-words font-mono text-gray-500 italic">
          /Users/calebclark/Projects/DLF/kitihawk/build/sites/test.js
          <img src="@/assets/icons/external.svg" class="icon w-4" />
        </div>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import Client from '@/api/Client';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';

export default defineComponent({
  name: 'MenuScriptInfo',
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

  .MenuScriptInfo {
    top: 0;
    border: 1px solid rgba(0,0,0,0.25);
    border-radius: 7px;
    box-shadow: 1px 1px 10px 1px rgba(0,0,0,0.3);

    ul {
      padding-left: 1px;
      padding-right: 1px;
      li {
        &.item {
          padding-left: 16px;
          padding-right: 14px;
        }
        &.separator {
          margin: 3px 0;
          height: 1px;
        }
      }
    }

    .script .path {
      background: rgba(0,0,0,0.04);
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 3px;
      padding: 5px 37px 5px 7px;
      position: relative;
      .icon {
        position: absolute;
        top: 7px;
        right: 10px;
      }
      &:hover {
        background: #FAF4FF;
      }
    }

    $arrowUpSize: 20;
    .arrow-up {
      width: #{$arrowUpSize}px;
      height: #{$arrowUpSize}px;
      overflow: hidden;
      position: absolute;
      top: -19px;
      left: 19px;

      &::before {
        content: '';
        display: block;
        width:  math.div($arrowUpSize, 1.41) * 1px;
        height: math.div($arrowUpSize, 1.41) * 1px;
        position: absolute;
        bottom: 0;
        left: -0.5px;
        background: white;
        border: 1px solid rgba(0,0,0,0.25);
        box-shadow: 1px 1px 5px 1px rgba(0,0,0,0.3);
        transform: rotate(45deg);
        transform-origin: 0 100%;
      }
    }
  }
</style>
