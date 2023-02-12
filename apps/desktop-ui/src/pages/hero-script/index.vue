<template>
  <div class="wrapper">
    <h5>{{ activeFilename }}</h5>
    <div
      v-for="(line, i) in activeFileLines"
      :ref="
        el => {
          lineElemsByIdx[i + 1] = el;
        }
      "
      class="line"
      :class="getClassesForLineIndex(i)"
      @click="clickLine(i + 1, activeFilename)"
    >
      <span class="line-number">{{ i + 1 }}.</span>
      <pre class="code">{{ line }}</pre>

      <select
        v-model="focusedCommandId"
        class="call-marker"
        @change="changedFocusedCommand()"
        @click.stop.prevent="onSelectClick($event)"
      >
        <option v-for="call of getCallsForLine(i + 1)" :value="call.commandId">
          {{ call.callInfo }}
        </option>
      </select>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import ICommandUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/ICommandUpdatedEvent';
import ICommandFocusedEvent from '@ulixee/apps-chromealive-interfaces/events/ICommandFocusedEvent';
import ISourceCodeUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/ISourceCodeUpdatedEvent';
import Client from '../../api/Client';

export default Vue.defineComponent({
  name: 'HeroScriptPanel',
  components: {},
  setup() {
    return {
      commandIdsByLineKey: {} as { [filename_line: string]: Set<number> },
      lineElemsByIdx: Vue.reactive<{ [index: number]: HTMLElement }>({}),
      focusedPositions: Vue.reactive<{ line: number; filename: string }[]>([]),
      focusedCommandId: Vue.ref<number>(null),
      scriptsByFilename: Vue.reactive<Record<string, ISourceCodeUpdatedEvent['lines']>>({}),
      commandsById: Vue.reactive<{ [commandId: number]: ICommandUpdatedEvent }>({}),
      scrollOnTimeout: -1,
    };
  },
  watch: {
    'focusedPositions.0.line': function (value) {
      const firstLine = value;
      if (!firstLine) return;
      clearTimeout(this.scrollOnTimeout);
      this.scrollOnTimeout = setTimeout(() => {
        const $el = this.lineElemsByIdx[firstLine];
        if ($el) $el.scrollIntoView({ block: 'center' });
      }) as any;
    },
  },
  computed: {
    activeFileLines(): string[] {
      const filename = this.activeFilename;
      if (!filename) return [];
      return this.scriptsByFilename[filename] ?? [];
    },
    activeFilename(): string {
      return this.focusedPositions?.length ? this.focusedPositions[0].filename : null;
    },
  },
  methods: {
    getCallsForLine(line: number): { commandId: number; callInfo: string; active: boolean }[] {
      const filename = this.activeFilename;
      if (!filename) return [];
      const commands = this.getCommandsAtPosition(line, filename);
      if (!commands?.length) return [];
      return commands.map((x, i) => {
        return {
          commandId: x.command.id,
          callInfo: `${i + 1} of ${commands.length}`,
          active: this.focusedCommandId === x.command.id,
        };
      });
    },
    onSelectClick(e): void {
      e.stopPropagation();
    },
    changedFocusedCommand(): void {
      Client.send('Session.timetravel', {
        commandId: this.focusedCommandId,
      }).catch(err => alert(err.message));
    },
    clickLine(line: number, filename: string): Promise<void> {
      const commandIds: Set<number> = this.commandIdsByLineKey[`${filename}_${line}`];
      if (!commandIds?.size) return;
      Client.send('Session.timetravel', {
        commandId: [...commandIds][0],
      }).catch(err => alert(err.message));
    },
    getCommandsAtPosition(line: number, filename: string): ICommandUpdatedEvent[] {
      if (!filename || line === undefined || line === null) return [];
      const commandIds: Set<number> = this.commandIdsByLineKey[`${filename}_${line}`];
      if (commandIds) {
        return [...commandIds].map(id => this.commandsById[id]).filter(Boolean);
      }
      return [];
    },
    getClassesForLineIndex(index: number) {
      const filename = this.activeFilename;
      const active =
        this.focusedPositions?.some(x => x.line === index + 1 && x.filename === filename) ?? false;

      const commandsAtLine = this.getCommandsAtPosition(index + 1, this.activeFilename);
      const hasError = commandsAtLine.some(x => x.command.resultType?.includes('Error'));
      return {
        active,
        error: hasError,
        'multi-call': commandsAtLine.length > 1,
        command: commandsAtLine.length > 0,
      };
    },
    onCommandUpdated(message: ICommandUpdatedEvent) {
      this.commandsById[message.command.id] = message;
      for (const position of message.originalSourcePosition ?? []) {
        const key = `${position.filename}_${position.line}`;
        this.commandIdsByLineKey[key] ??= new Set();
        this.commandIdsByLineKey[key].add(message.command.id);
      }
      if (!this.focusedCommandId && message.originalSourcePosition?.length) {
        this.setFocusedPositions(message.originalSourcePosition);
      }
    },
    onCommandFocused(message: ICommandFocusedEvent) {
      this.focusedCommandId = message.commandId;
      const position = this.commandsById[message.commandId]?.originalSourcePosition;
      if (!position?.length) return;
      this.setFocusedPositions(position);
    },
    onSourceCodeUpdated(message: ISourceCodeUpdatedEvent) {
      this.scriptsByFilename[message.filename] = message.lines;
      if (!this.focusedPositions.length) {
        this.focusedPositions.push({ filename: message.filename, line: 1 });
      }
    },

    onScriptStateResponse(message: {
      commandsById: Record<number, ICommandUpdatedEvent>;
      sourceFileLines: Record<string, string[]>;
      focusedCommandId: number;
    }) {
      if (!message) return;
      for (const ev of Object.values(message.commandsById)) {
        this.onCommandUpdated(ev);
      }
      for (const [filename, lines] of Object.entries(message.sourceFileLines)) {
        this.onSourceCodeUpdated({ filename, lines });
      }
      if (message.focusedCommandId) {
        this.onCommandFocused({ commandId: message.focusedCommandId });
      }
    },

    // private functions

    setFocusedPositions(positions: ICommandUpdatedEvent['originalSourcePosition']) {
      positions ??= [];
      this.focusedPositions.length = positions.length;
      Object.assign(this.focusedPositions, positions);
    },
  },

  mounted() {
    Client.send('Session.getScriptState', {})
      .then(this.onScriptStateResponse)
      .catch(err => alert(String(err)));

    Client.on('SourceCode.updated', this.onSourceCodeUpdated);
    Client.on('Command.updated', this.onCommandUpdated);
    Client.on('Command.focused', this.onCommandFocused);
  },

  beforeUnmount() {
    Client.off('SourceCode.updated', this.onSourceCodeUpdated);
    Client.off('Command.updated', this.onCommandUpdated);
    Client.off('Command.focused', this.onCommandFocused);
  },
});
</script>

<style lang="scss">
:root {
  --toolbarBackgroundColor: #f5faff;
  --buttonActiveBackgroundColor: rgba(176, 173, 173, 0.4);
  --buttonHoverBackgroundColor: rgba(255, 255, 255, 0.08);
}

body {
  height: 100vh;
  margin: 0;
  border-top: 0 none;
  width: 100%;
}

.wrapper {
  box-sizing: border-box;
  background: white;
  margin: 0;
}
h5 {
  margin: 10px;
}
.line {
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: end;
  align-items: baseline;
  line-height: 16px;
  margin: 0;
  padding: 0;
  pointer-events: none;
  color: #999999;

  .call-marker {
    display: none;
  }

  &.command {
    color: black;
    pointer-events: initial;
    &.multi-call {
      .call-marker {
        display: none;
        float: right;
        font-size: 11px;
        width: 60px;
      }
      &:hover .call-marker {
        display: block;
      }
      &.active .call-marker {
        display: block;
      }
    }
    &:hover {
      background: aliceblue;
      cursor: pointer;
    }
    .line-number {
      background: aliceblue;
    }
  }
  &.active {
    background: #00a86b;
    color: white;
    &:hover {
      background: #00a86b;
    }
    .line-number {
      font-weight: bold;
      color: black;
    }
  }
  &.error {
    background: #c7ea46 !important;
  }
  .line-number {
    display: flex;
    flex-grow: 0;
    flex-basis: 30px;
    line-height: 16px;
    font-size: 12px;
    color: #595959;
  }
  pre {
    flex: 1;
    margin: 1px 0;
    font-family: system-ui;
    font-size: 13px;
    line-height: 13px;
  }
}
</style>
