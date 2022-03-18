<template>
  <div class="py-12 px-28">
    <div class="pb-5 mb-5 border-b border-gray-400 text-center">
      <div class="text-2xl mb-2 script-path font-thin opacity-50">{{ scriptEntrypoint }}</div>
      <h1>INPUT CONFIGURATION</h1>
    </div>
    <ul class="flex flex-row border-b border-gray-200 pb-5">
      <li class="flex-1">Started {{ startTime }}</li>
      <li class="flex-1">Finished on {{ endTime }}</li>
    </ul>

    <h2>Databox Input:</h2>
    <div class="box bg-gray-50 border border-gray-200">
      <Json :json="input" class="p-5 text-sm text-gray-600" />
    </div>

    <h2>Hero Settings:</h2>
    <ul class="hero-settings">
      <li>
        <div class="label">User Agent String</div>
        <div class="value">{{ meta.userAgentString }}</div>
      </li>
      <li>
        <div class="label">User Agent OS</div>
        <div class="value">{{ meta.operatingSystemName }} {{ meta.operatingSystemVersion }}</div>
      </li>
      <li>
        <div class="label">User Agent Browser</div>
        <div class="value">{{ meta.browserName }} {{ meta.browserFullVersion }}</div>
      </li>
      <li>
        <div class="label">Rendering Engine</div>
        <div class="value">{{ meta.renderingEngine }} {{ meta.renderingEngineVersion }}</div>
      </li>
      <li v-if="meta.upstreamProxyIpMask">
        <div class="label">Hero Core IP Address</div>
        <div class="value">{{ meta.upstreamProxyIpMask.publicIp }}</div>
      </li>
      <li>
        <div class="label">Proxy IP Address</div>
        <div class="value">{{ meta.upstreamProxyIpMask?.proxyIp ?? 'No Proxy Used' }}</div>
      </li>
      <li v-if="meta.viewport">
        <div class="label">Viewport</div>
        <div class="value">
          Screen: {{ meta.viewport.screenWidth }}x{{ meta.viewport.screenHeight }}, Viewport:
          {{ meta.viewport.width }}x{{ meta.viewport.height }}, Scale
          {{ meta.viewport.deviceScaleFactor || '(default)' }}, Browser Position: [{{ meta.viewport.positionX }},
          {{ meta.viewport.positionY }}]
        </div>
      </li>
      <li>
        <div class="label">Timezone</div>
        <div class="value">{{ meta.timezoneId }}</div>
      </li>
      <li>
        <div class="label">Geolocation</div>
        <div class="value">{{ meta.geolocation ?? '-' }}</div>
      </li>
      <li>
        <div class="label">Locale</div>
        <div class="value">{{ meta.locale }}</div>
      </li>
      <li>
        <div class="label">Session ID</div>
        <div class="value">{{ meta.sessionId }}</div>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import IHeroMeta from '@ulixee/hero-interfaces/IHeroMeta';
import moment from 'moment';
import Client from '@/api/Client';
import { convertJsonToFlat, FlatJson } from '@/utils/flattenJson';
import Json from '@/components/Json.vue';

export default Vue.defineComponent({
  name: 'Input',
  components: { Json },
  setup() {
    return {
      scriptEntrypoint: Vue.ref<string>(null),
      startTime: Vue.ref<string>(''),
      endTime: Vue.ref<string>(''),
      input: Vue.ref<FlatJson[]>([]),
      meta: Vue.ref<IHeroMeta>({} as any),
    };
  },
  methods: {
    onSessionActive(data: IHeroSessionActiveEvent) {
      if (!data) return;
      if (!this.scriptEntrypoint || !data.scriptEntrypoint.endsWith(this.scriptEntrypoint)) {
        this.input = convertJsonToFlat({});
        this.meta = {} as any;
        this.refreshMeta();
      }
      const divider = data.scriptEntrypoint.includes('/') ? '/' : '\\';
      this.scriptEntrypoint = data.scriptEntrypoint.split(divider).slice(-2).join(divider);
      this.startTime = moment(data.startTime).format(`LL [at] LTS z`);
      this.endTime = moment(data.endTime ?? Date.now()).format(`LL [at] LTS z`);
    },
    onHeroMeta(meta: IHeroMeta) {
      this.input = convertJsonToFlat(meta.input ?? {});
      this.meta = meta;
    },
    refreshMeta(): void {
      Client.send('Session.getActive')
        .then(this.onSessionActive)
        .catch(err => console.error(err));
      Client.send('Session.getMeta')
        .then(this.onHeroMeta)
        .catch(err => console.error(err));
    },
  },
  mounted() {
    Client.connect().catch(err => console.error(err));
    this.refreshMeta();
    Client.on('Session.active', this.onSessionActive);
  },
});
</script>

<style lang="scss" scoped="scoped">
h1 {
  color: #ada0b6;
  @apply text-6xl mb-3;
}

h2 {
  @apply mt-10 font-bold mb-5;
}

ul.hero-settings {
  @apply grid grid-cols-2 gap-x-4;
  li:nth-child(1),
  li:nth-child(2) {
    @apply border-t;
  }
  li {
    @apply border-b py-5 font-thin;
    .label {
      @apply text-gray-400;
    }
  }
}
</style>
