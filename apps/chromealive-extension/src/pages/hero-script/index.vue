<template>
  <div class="wrapper">
    <h5>{{ activeFilename }}</h5>
    <div
      class="line"
      v-for="(line, i) in activeFileLines"
      @click="clickLine(i + 1, activeFilename)"
      :class="getClassesForLineIndex(i)"
      :ref="
        el => {
          lineElemsByIdx[i + 1] = el;
        }
      "
    >
      <span class="line-number">{{ i + 1 }}.</span>
      <pre class="code">{{ line }}</pre>

      <select
        class="call-marker"
        @change="changedFocusedCommand()"
        @click.stop.prevent="onSelectClick($event)"
        v-model="focusedCommandId"
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
import Client from '../../api/Client';
import ICommandUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/ICommandUpdatedEvent';
import ICommandFocusedEvent from '@ulixee/apps-chromealive-interfaces/events/ICommandFocusedEvent';
import ISourceCodeUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/ISourceCodeUpdatedEvent';
import { sendToBackgroundScript } from '../../lib/devtools/DevtoolsMessenger';

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
    };
  },
  watch: {
    ['focusedPositions.0.line'](value) {
      const firstLine = value;
      if (!firstLine) return;
      setTimeout(() => {
        const $el = this.lineElemsByIdx[firstLine];
        if ($el) $el.scrollIntoView({ block: 'center' });
      });
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
        heroSessionId: null,
        commandId: this.focusedCommandId,
      }).catch(err => alert(err.message));
    },
    clickLine(line: number, filename: string): Promise<void> {
      const commandIds: Set<number> = this.commandIdsByLineKey[`${filename}_${line}`];
      if (!commandIds?.size) return;
      Client.send('Session.timetravel', {
        heroSessionId: null,
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
    }) {
      if (!message) return;
      for (const ev of Object.values(message.commandsById)) {
        this.onCommandUpdated(ev);
      }
      for (const [filename, lines] of Object.entries(message.sourceFileLines)) {
        this.onSourceCodeUpdated({ filename, lines });
      }
    },

    // private functions

    setFocusedPositions(positions: ICommandUpdatedEvent['originalSourcePosition']) {
      positions ??= [];
      this.focusedPositions.length = positions.length;
      Object.assign(this.focusedPositions, positions);
    },
  },

  async mounted() {
    sendToBackgroundScript({ action: 'getCoreServerAddress' }, serverAddress => {
      window.setHeroServerUrl(serverAddress);
      Client.send('Session.getScriptState')
        .then(this.onScriptStateResponse)
        .catch(err => alert(String(err)));

      Client.on('SourceCode.updated', this.onSourceCodeUpdated);
      Client.on('Command.updated', this.onCommandUpdated);
      Client.on('Command.focused', this.onCommandFocused);
    });
  },

  beforeUnmount() {
    Client.off('SourceCode.updated', this.onSourceCodeUpdatd);
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
  height: 16px;
  margin: 2px 0;
  .call-marker {
    display: none;
  }

  &:hover {
    background: #eeeeee;
  }
  &.command {
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
    background: green;
    color: white;
    &:hover {
      background: green;
    }
  }
  &.error {
    background: yellow !important;
  }
  .line-number {
    display: flex;
    flex-grow: 0;
    flex-basis: 30px;
    line-height: 13px;
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
