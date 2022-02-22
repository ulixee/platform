<template>
  <div class="Wrapper">
    <div class="OutputPanel">
      <h2>
        Output
        <span class="DataSize">{{ dataSize }}</span>
      </h2>
      <Json v-if="output" :json="output" :scrollToRecordId="scrollToRecordId" />
      <div v-else class="Explainer">
        <p>This panel shows output set using "databox.output".</p>
        <p>You can use the "databox.output" object as an array:</p>
        <pre>
 databox.output.push({
   text,
   href,
 })     </pre
        >
        <p>Or as an object:</p>
        <pre>databox.output.text = text;</pre>
        <p>
          As you set each data-entry, it will stream into this panel as the same json you'll get if
          you print databox.output:
        </p>
        <pre>console.log(databox.output);</pre>
      </div>
    </div>
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
      Client.on('Session.active', event => onSessionActive(event));
    });

    Client.connect().catch(err => alert(String(err)));
    document.title = 'Databox Panel';

    return { dataSize, output, scrollToRecordId };
  }
});
</script>

<style lang="scss">
@import '../../assets/style/common-mixins';
@import '../../assets/style/resets';

:root {
  --toolbarBackgroundColor: #fffdf4;
}

body {
  height: 100vh;
  margin: 0;
  border-top: 0 none;
  width: 100%;
}

.Wrapper {
  box-sizing: border-box;
  background: white;
  margin: 0;
}

.OutputPanel,
.InputPanel {
  box-sizing: border-box;
  padding: 0 10px 10px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  width: 100%;
  margin-bottom: 10px;

  h2 {
    font-family: system-ui, sans-serif;
    font-size: 15px;
    text-align: left;
    padding: 5px 15px 5px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    background-color: var(--toolbarBackgroundColor);
    box-shadow: 0 0 1px rgba(0, 0, 0, 0.12), 0 1px 1px rgba(0, 0, 0, 0.16);
    margin: 0 -20px 10px;
    color: #2d2d2d;
  }
}

.Explainer {
  margin: 5px;
  border-radius: 5px;
  border: 1px solid #e4e4e4;
  background: #fbfbfb;
  padding: 10px;

  pre {
    padding: 10px;
    background: #eeeeee;
  }
}

.DataSize {
  font-weight: normal;
  font-size: 0.9em;
  font-style: italic;
  color: #3c3c3c;
}
</style>
