<template>
  <div class="Wrapper">
    <div class="OutputPanel">
      <div v-if="output.length" class="Json">
        <div
          class="JsonNode"
          v-for="node of output"
          :key="node.id"
          :ref="node.id"
          :id="node.path"
          :class="{ highlighted: node.highlighted }"
        >
          <div class="indent" v-for="i in node.level" :key="i">{{ ' ' }}</div>
          <span v-if="node.key" class="key">{{ node.key }}: </span>
          <span>
            <span :class="{ ['value-' + node.type]: node.isContent, brackets: !node.isContent}">{{ node.content }}</span>
            <span v-if="node.showComma" class="comma">, </span>
          </span>
        </div>
      </div>
      <div v-else class="Explainer">
        <h4>Databox Output</h4>
        <p>This panel shows output set using "databox.output".</p>
        <p>You can use the "databox.output" object as an array:</p>
        <pre>
         databox.output.push({
           text,
           href,
         })
        </pre>
        <p>Or as an object:</p>
        <pre>
          databox.output.text = text;
        </pre>
        <p>
          As you set each data-entry, it will stream into this panel as the same json you'll get if
          you print databox.output:
        </p>
        <pre>console.log(databox.output);</pre>
      </div>
      <div class="Datasize" v-if="dataSize">Output size: {{ dataSize }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';
import flattenJson, { FlatJson } from '@/utils/flattenJson';
import Client from '@/api/Client';
import IOutputUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IOutputUpdatedEvent';
import humanizeBytes from '@/utils/humanizeBytes';

@Component
export default class OutputPanel extends Vue {
  private output: FlatJson[] = [];

  private dataSize: string = null;
  private client = Client;

  created() {
    this.client.connect().catch(err => alert(String(err)));
  }

  mounted() {
    this.client.on('Output.updated', message => {
      this.onOutputReceived(message);
    });
  }

  private onOutputReceived(data: IOutputUpdatedEvent) {
    const { output, bytes, changes } = data;
    if (output === null || bytes === 0) {
      this.dataSize = null;
      this.output = [];
      return;
    }
    const json = flattenJson(output);
    let counter = 0;
    let recordToScroll: FlatJson;
    for (const record of json) {
      record.id = counter += 1;
      if (changes && changes.some(x => x.path && record.path.startsWith(x.path))) {
        record.highlighted = true;
        recordToScroll = record;
      }
    }
    this.dataSize = humanizeBytes(bytes);
    this.output = json;
    if (recordToScroll) {
      this.$nextTick(() => {
        const refs = this.$refs[recordToScroll.id] as HTMLElement[];
        if (!refs) return;
        if (refs.length) {
          refs[refs.length - 1].scrollIntoView({ block: 'center' });
        }
      });
    }
  }
}
</script>

<style lang="scss">
@import '../../assets/style/resets';
@import '../../assets/style/flatjson';

body {
  height: 100vh;
  margin: 0;
  border-top: 0 none;
  width: 100%;
}
.Wrapper {
  box-sizing: border-box;
  background: white;
  border-left: 1px solid var(--toolbarBorderColor);
  box-shadow: inset 1px 0 rgba(0, 0, 0, 0.2);
  margin: 0;
}
.OutputPanel {
  box-sizing: border-box;
  padding: 20px 10px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  height: 100%;
  width: 100%;

  h4 {
    text-align: center;
    text-decoration: underline;
    margin-top: 0;
    margin-bottom: 5px;
  }
}

.Explainer {
  margin: 5px;
  border-radius: 5px;
  border: 1px solid #e2ecec;
  background: #eeeeee;
  padding: 10px;
}

.Datasize {
  text-align: center;
  font-style: italic;
  color: #3c3c3c;
}
</style>
