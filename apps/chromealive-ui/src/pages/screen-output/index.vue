<template>
  <div class="py-12 px-28">
    <div class="pb-5 mb-5 border-b border-gray-400 text-center ">
      <div class="text-2xl mb-2 script-path font-thin opacity-50">sites/kayak.ts</div>
      <h1>OUTPUT DATA</h1>
    </div>

    <ul class="flex flex-row border-b border-gray-200 pb-5">
      <li class="flex-1">Started January 23, 2022 at 11:35:39 AM EST</li>
      <li class="flex-1">Finished on January 23, 2022 at 11:36:02 AM EST</li>
    </ul>

    <h2>Databox Output <span>{{ dataSize }}</span>:</h2>
    <div class="box bg-gray-50 border border-gray-200 min-h-[200px]">
      <Json v-if="output" :json="output" :scrollToRecordId="scrollToRecordId" class="p-5 text-sm text-gray-600" />
    </div>
    4 Collected Resources, 3 Collected Elements, 18 Extract Functions
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import IDataboxUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IDataboxUpdatedEvent';
import humanizeBytes from '@/utils/humanizeBytes';
import Json from '@/components/Json.vue';
import { FlatJson, convertJsonToFlat } from '@/utils/flattenJson';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';

const defaultInput = convertJsonToFlat({ path: '/', params: {} });

export default Vue.defineComponent({
  name: 'Databox',
  components: { Json },
  setup() {
    let dataSize = Vue.ref(null);
    let output = Vue.ref<FlatJson[]>(null);
    let scrollToRecordId = Vue.ref<number>(null);
    let lastHeroEntrypoint: string = null;

    function onSessionActive(data: IHeroSessionActiveEvent) {
      if (lastHeroEntrypoint && data.scriptEntrypoint !== lastHeroEntrypoint) {
        onDataboxUpdated({} as IDataboxUpdatedEvent)
      }
      lastHeroEntrypoint = data.scriptEntrypoint;
    }

    function onDataboxUpdated(data: IDataboxUpdatedEvent) {
      const { bytes, changes } = data;

      dataSize.value = humanizeBytes(bytes);
      if (data.output) {
        output.value = convertJsonToFlat(
          data.output,
          changes?.map(x => x.path),
        );

        if (output.value.length) {
          Vue.nextTick(() => {
            const recordToScroll = output.value
              .filter(x => x.highlighted)
              .slice(-1)
              .pop();
            scrollToRecordId.value = recordToScroll ? recordToScroll.id : null;
          });
        }
      } else {
        output = null;
      }
    }

    Vue.onMounted(() => {
      Client.on('Databox.updated', event => onDataboxUpdated(event));
    });

    Client.connect().catch(err => alert(String(err)));
    document.title = 'Databox Panel';

    return { dataSize, output, scrollToRecordId };
  }
});
</script>

<style lang="scss" scoped="scoped">

h1 {
  color: #ADA0B6;
  @apply text-6xl mb-3;
}

h2 {
  @apply mt-10 font-bold mb-5;
}

</style>
