<template>
  <div class="Wrapper">
    <div class="InputPanel">
      <h2>Input</h2>
      <Json :json="input" />
    </div>
    <div class="OutputPanel">
      <h2>
        Output
        <span class="DataSize">{{ dataSize }}</span>
      </h2>
      <Json v-if="output" :json="output" ref="output" />
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
import Vue from 'vue';
import Component from 'vue-class-component';
import Client from '@/api/Client';
import IDataboxUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IDataboxUpdatedEvent';
import humanizeBytes from '@/utils/humanizeBytes';
import Json from '@/components/Json.vue';
import { FlatJson } from '@/utils/flattenJson';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';

const defaultInput = Json.toFlat({ path: '/', params: {} });

@Component({
  components: { Json },
})
export default class DataboxPanel extends Vue {
  private input: FlatJson[] = defaultInput;
  private output: FlatJson[] = null;

  private dataSize: string = null;
  private client = Client;
  private lastHeroEntrypoint: string = null;

  private get OutputJson(): Json {
    return this.$refs.output as Json;
  }

  created() {
    this.client.connect().catch(err => alert(String(err)));
    document.title = 'Databox Panel';
  }

  mounted() {
    this.client.on('Databox.updated', event => this.onDataboxUpdated(event));
    this.client.on('Session.active', event => this.onSessionActive(event));
  }

  private onSessionActive(data: IHeroSessionActiveEvent) {
    if (this.lastHeroEntrypoint && data.scriptEntrypoint !== this.lastHeroEntrypoint) {
      this.onDataboxUpdated({} as IDataboxUpdatedEvent)
    }
    this.lastHeroEntrypoint = data.scriptEntrypoint;
  }

  private onDataboxUpdated(data: IDataboxUpdatedEvent) {
    const { input, output, bytes, changes } = data;

    this.input = input ? Json.toFlat(input) : defaultInput;
    this.dataSize = humanizeBytes(bytes);
    if (output) {
      this.output = Json.toFlat(
        output,
        changes?.map(x => x.path),
      );

      if (this.output.length) {
        this.$nextTick(() => {
          const recordToScroll = this.output
            .filter(x => x.highlighted)
            .slice(-1)
            .pop();
          if (recordToScroll) this.OutputJson.scrollToId(recordToScroll.id);
        });
      }
    } else {
      this.output = null;
    }
  }
}
</script>

<style lang="scss">
@import '../../assets/style/common-mixins';
@import '../../assets/style/resets';
@import '../../assets/style/flatjson';

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
