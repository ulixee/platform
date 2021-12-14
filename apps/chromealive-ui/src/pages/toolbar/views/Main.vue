<template>
  <div :class="{ minimized: isMinimized }">
    <ul>
      <li ref="circuitsElem" :class="{ alert: circuitsElemHasAlert }">
        <div @click="openSection(sections.circuits)" class="link">
          <img class="icon" :src="sections.circuits.icon" />
          <div class="label">{{sections.circuits.title}}</div>
          <div class="count">{{ pageStates.length }}</div>
          <div class="arrow"></div>
        </div>
      </li>

      <li ref="selectorsElem">
        <div @click="openSection(sections.selectors)" class="link">
          <img class="icon" :src="sections.selectors.icon" />
          <div class="label">{{sections.selectors.title}}</div>
          <div class="count">5</div>
          <div class="arrow"></div>
        </div>
      </li>

      <li ref="worldsElem">
        <div @click="openSection(sections.worlds)" class="link">
          <img class="icon" :src="sections.worlds.icon" />
          <div class="label">{{sections.worlds.title}}</div>
          <div class="count">{{ worldSessionIds.size }}</div>
          <div class="arrow"></div>
        </div>
      </li>

      <li ref="outputElem">
        <div @click="openSection(sections.output)" class="link">
          <img class="icon" :src="sections.output.icon" />
          <div class="label">{{sections.output.title}}</div>
          <div class="count">{{ outputSize || '0kb' }}</div>
          <div class="arrow"></div>
        </div>
      </li>

      <li ref="timetravelElem">
        <div @click="openTimetravelMode()" class="link">
          <img class="icon" :src="sections.timetravel.icon" />
          <div class="label">{{sections.timetravel.title}}</div>
          <div class="arrow"></div>
        </div>
      </li>

      <li ref="vitalsElem">
        <div @click="openSection(sections.vitals)" class="link">
          <img class="icon" :src="sections.vitals.icon" />
          <div class="label">{{sections.vitals.title}}</div>
          <div class="arrow"></div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import IDataboxUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IDataboxUpdatedEvent';
import IPageStateUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IPageStateUpdatedEvent';
import Client from '@/api/Client';
import humanizeBytes from '@/utils/humanizeBytes';
import emitter from '../emitter';

export default Vue.defineComponent({
  name: 'Main',
  props: ['sections', 'isMinimized', 'hasOpenPanel'],
  setup() {
    return {
      circuitsElem: Vue.ref<HTMLElement>(),
      circuitsElemHasAlert: Vue.ref(false),
      selectorsElem: Vue.ref<HTMLElement>(),
      worldsElem: Vue.ref<HTMLElement>(),
      outputElem: Vue.ref<HTMLElement>(),
      timetravelElem: Vue.ref<HTMLElement>(),
      vitalsElem: Vue.ref<HTMLElement>(),
      pageStates: Vue.ref<IHeroSessionActiveEvent['pageStates']>([]),
      outputSize: Vue.ref<string>(''),
      worldSessionIds: Vue.reactive(new Set<string>()),

      popupAlert: Vue.reactive({} as { offset: number; circuitId: string; window: Window }),
      autoshownCircuitId: Vue.ref<string>(null),
    };
  },
  methods: {
    openSection({ id }) {
      emitter.emit('showSection', id);
    },

    openTimetravelMode() {
      emitter.emit('openTimetravelMode');
    },

    onSessionActiveEvent(message: IHeroSessionActiveEvent) {
      if (!message) {
        this.pageStates.length = 0;
        this.worldSessionIds.clear();
        this.outputSize = '';
        return;
      }

      this.pageStates.length = message.pageStates.length;
      Object.assign(this.pageStates, message.pageStates)
      for (const worldHeroSessionId of message.worldHeroSessionIds) {
        this.worldSessionIds.add(worldHeroSessionId);
      }

      if (message?.pageStateIdNeedsResolution && !this.hasOpenPanel) {
        this.showCircuitAlert();
        this.autoshownCircuitId = message.pageStateIdNeedsResolution;
      }
      if (!message?.pageStateIdNeedsResolution) {
        if (this.popupAlert.circuitId === this.autoshownCircuitId) {
          this.closeCircuitAlert();
        }
        this.autoshownCircuitId = null;
      }
    },

    showCircuitAlert() {
      const { popupAlert } = this;
      if (popupAlert.window) return;

      const width = 300;
      const height = 100;
      const top = this.circuitsElem.getBoundingClientRect().top - 15;
      const features = `offsetY=${top},width=${width},height=${height}`;
      popupAlert.window = window.open(
        '/popup-alert.html',
        'PopupAlert',
        features,
      );
      this.circuitsElemHasAlert = true;

      const alertWindow = this.popupAlert.window as any;
      alertWindow.initialState = { circuitIsBroken: true };
      alertWindow.openCircuitPanel = () => {
        this.closeCircuitAlert();
        emitter.emit('openCircuitPanel');
      }
      alertWindow.dismissAlert = () => this.closeCircuitAlert();
      alertWindow.setAlertContentHeight = height => emitter.emit('setAlertContentHeight', height);
      (window as any).popupAlert = popupAlert;
    },

    closeCircuitAlert() {
      if (this.popupAlert.window) {
        emitter.emit('closePopupAlert');
        this.popupAlert.window = null;
        this.circuitsElemHasAlert = true;
      }
    },

    onDataboxUpdated(message: IDataboxUpdatedEvent) {
      this.outputSize = humanizeBytes(message?.output);
    },

    onPageStateUpdated(message: IPageStateUpdatedEvent) {
      if (this.pageStates.some(x => x.id === message?.id)) {
        for (const heroSession of message.heroSessions) {
          if (heroSession.id === 'placeholder') continue;
          this.worldSessionIds.add(heroSession.id);
        }
      }
    },
  },

  async created() {
    await Client.connect();
  },

  mounted() {
    emitter.emit('resizeWidth', this.isMinimized ? 'minimized' : 'maximized');
    Client.on('PageState.updated', this.onPageStateUpdated);
    Client.on('Databox.updated', this.onDataboxUpdated);
    Client.on('Session.active', this.onSessionActiveEvent);
  },

  beforeUnmount() {
    this.closeCircuitAlert();
    Client.off('Session.active', this.onSessionActiveEvent);
  },
});

</script>

<style lang="scss" scoped="scoped">
  $squareRootOf2: 1.4142135623730950488016887242097;

  :root {
    --toolbarBorderColor: rgba(0, 0, 0, 0.3);
    --toolbarBackgroundColor: #faf4ff;
    --toolbarBorderRadius: 5px;
  }

  .minimized {
    li {
      .label { display: none; }
      .count { display: none; }
    }
  }

  li {
    @apply border-t text-base;
    padding: 1px 0;
    text-shadow: 1px 1px 0 white;
    &:first-child {
      border-top: none;
      padding-top: 0;
    }
    &:last-child .link {
      border-radius: 0 0 var(--toolbarBorderRadius) var(--toolbarBorderRadius);
    }
    .link {
      @apply flex flex-row items-stretch py-3 pl-3 pr-2 cursor-default relative;
      height: 45px;
      &:hover {
        @apply bg-purple-100;
      }
    }
    .icon {
      @apply w-5 mr-2;
    }
    .label {
      @apply flex-1;
      max-width: 150px;
    }
    .count {
      @apply ml-6 mr-2;
      opacity: 0.4;
    }
    .arrow {
      display: none;
    }
    &.alert .arrow {
      display: block;
      position: absolute;
      top: 50%;
      margin-top: calc(#{$squareRootOf2} * -10px);
      right: -1px;
      width: calc(#{$squareRootOf2} * 10px);
      height: calc(#{$squareRootOf2} * 20px);
      overflow: hidden;
      &:before {
        content: '';
        position: absolute;
        width: 20px;
        height: 20px;
        left: 100%;
        background: var(--toolbarBackgroundColor);
        border: 1px solid var(--toolbarBorderColor);
        transform: rotate(45deg);
        transform-origin: 0% 0%;
      }
    }
  }
</style>
