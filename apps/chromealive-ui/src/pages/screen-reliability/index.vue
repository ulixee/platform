<template>
  <div class="py-12 px-28">
    <div class="pb-5 mb-5 border-b border-gray-400 text-center">
      <div class="text-2xl mb-2 script-path font-thin opacity-50">{{ scriptEntrypoint }}</div>
      <h1>RELIABILITY TESTING</h1>
    </div>
    <h5>COMING SOON!</h5>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';

export default Vue.defineComponent({
  name: 'Input',
  setup() {
    return {
      scriptEntrypoint: Vue.ref<string>(null),
    };
  },
  methods: {
    onSessionActive(data: IHeroSessionActiveEvent) {
      const divider = data.scriptEntrypoint.includes('/') ? '/' : '\\';
      this.scriptEntrypoint = data.scriptEntrypoint.split(divider).slice(-2).join(divider);
    },
    refreshData(): void {
      Client.send('Session.getActive')
        .then(this.onSessionActive)
        .catch(err => alert(String(err)));
    },
  },
  mounted() {
    Client.connect().catch(err => alert(String(err)));
    this.refreshData();
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
</style>
