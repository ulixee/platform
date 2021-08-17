<template>
  <Page>
    <div class="Drag" @mousedown="onDragdown" @mouseup="onDragup">
      <div class="Handle">|</div>
    </div>
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
          <span v-if="node.key" class="key">{{ node.key }}:&nbsp;</span>
          <span>
            <span v-if="node.isContent === false" class="brackets">{{ node.content }}</span>
            <span v-else class="value" :class="'value-' + node.type">{{ formatValue(node) }}</span>
            <span v-if="node.showComma" class="comma">, </span>
          </span>
        </div>
      </div>
      <div v-else class="Explainer">
        <h4>Agent Output</h4>
        <p>This panel shows output set using "agent.output".</p>
        <p>You can use the "agent.output" object as an array:</p>
        <pre>
         agent.output.push({
           text,
           href,
         })
        </pre>
        <p>Or as an object:</p>
        <pre>
          agent.output.text = text;
        </pre>
        <p>
          As you set each data-entry, it will stream into this panel as the same json you'll get if
          you print agent.output:
        </p>
        <pre>console.log(agent.output);</pre>
      </div>
      <div class="Datasize" v-if="dataSize">Output size: {{ dataSize }}</div>
    </div>
  </Page>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';
import flattenJson, { FlatJson } from './flattenJson';
import Client from '@/api/Client';
import IOutputUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IOutputUpdatedEvent';

@Component
export default class OutputPanel extends Vue {
  private output: FlatJson[] = [];

  private isResizing = false;
  private lastResizeScreenX: number;
  private dataSize: string = null;
  private client = Client;

  private formattedSize(bytes: number): string {
    if (!bytes) return null;

    const kb = bytes / 1024;
    if (kb > 1024) {
      const mb = kb / 1024;
      return `${Math.round(mb * 10) / 10}mb`;
    }
    return `${Math.round(kb * 10) / 10}kb`;
  }

  private formatValue(node: FlatJson): string {
    let text = node.content + '';
    if (node.type === 'string') text = `"${text}"`;
    return text;
  }

  created() {
    this.client.connect().catch(err => alert(String(err)));
  }

  mounted() {
    window.addEventListener('mouseup', this.onDragup);
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
    this.dataSize = this.formattedSize(bytes);
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

  private onDragdown() {
    window.addEventListener('mousemove', this.onDragmove);
    this.isResizing = true;
  }

  private onDragup() {
    window.removeEventListener('mousemove', this.onDragmove);
    this.isResizing = false;
  }

  private onDragmove(event) {
    const start = this.lastResizeScreenX;
    this.lastResizeScreenX = event.screenX;
    if (this.isResizing && start !== undefined) {
      const moveX = start - this.lastResizeScreenX;
      if (moveX !== 0) {
        // ipcRenderer.send('output-drag', moveX);
      }
    }
  }
}
</script>

<style lang="scss">
@import '../../assets/style/resets';
body {
  height: 100vh;
  margin: 0;
  border-top: 0 none;
  width: 100%;
}
.Page {
  box-sizing: border-box;
  background: white;
  border-left: 1px solid var(--toolbarBorderColor);
  box-shadow: inset 1px 0 rgba(0, 0, 0, 0.2);
  margin: 0;
}
.vjs-tree {
  font-size: 12px;
}
.Drag {
  position: absolute;
  z-index: 1;
  user-select: none;
  top: 50%;
  .Handle {
    position: relative;
    left: -8px;
    height: 30px;
    background: #aaaaaa;
    width: 16px;
    border-radius: 5px;
    text-align: center;
    color: white;
    text-indent: 5px;
    vertical-align: middle;
    line-height: 30px;
  }
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
  .Json {
    font-family: 'Monaco', 'Menlo', 'Consolas', 'Bitstream Vera Sans Mono', monospace;
    font-size: 12px;
    text-align: left;
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
.JsonNode {
  display: flex;
  position: relative;
  &.highlighted {
    background-color: #f3fbff;
  }
  .key {
    padding-right: 5px;
  }
  .brackets,
  .comma {
    color: #949494;
  }
  .indent {
    flex: 0 0 1em;
    border-left: 1px dashed #d9d9d9;
  }
  .comment {
    color: #bfcbd9;
  }

  .value-null {
    color: #ff4949;
  }

  .value-number {
    color: #1d8ce0;
  }

  .value-boolean {
    color: #1d8ce0;
  }

  .value-string {
    color: #13ce66;
  }
}
</style>
