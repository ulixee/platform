<template>
  <div class="wrapper" :class="{ 'dragging-session': !!draggingSessionId }">
    <FocusedState
      v-if="focusedState"
      :focused-session-id="focusedSessionId"
      :focused-state-name="focusedStateName"
      :latest-screenshots-by-sessionId="latestScreenshotsBySessionId"
      :focus-on-session="focusOnSession"
      @back="unfocusState()"
    >
    </FocusedState>
    <div v-else id="manage-states">
      <div
        @click.prevent="focusOnSession(primarySession)"
        id="primary-session"
        v-if="primarySession"
        class="session"
        :class="{
          focused: primarySession.isFocused,
        }"
      >
        <div
          class="session-preview"
          :class="{
            loading: !latestScreenshotsBySessionId[primarySession.id] && primarySession.isRunning,
          }"
        >
          <img
            v-if="latestScreenshotsBySessionId[primarySession.id]"
            class="screenshot"
            :src="latestScreenshotsBySessionId[primarySession.id]"
          />
          <span class="times">{{ formattedTimeRange(primarySession) }}</span>
        </div>
        <div class="session-asserts">
          <h5 class="session-name">Live World</h5>

          <table class="asserts">
            <thead>
              <tr>
                <th></th>
                <th>Asserts</th>
                <th>DOM</th>
                <th>Resources</th>
                <th>Storage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td></td>
                <td>{{ primarySession.assertionCounts.total }}</td>
                <td>{{ primarySession.assertionCounts.dom }}</td>
                <td>{{ primarySession.assertionCounts.resources }}</td>
                <td>{{ primarySession.assertionCounts.storage }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <table id="states" class="asserts">
        <thead>
          <tr>
            <th></th>
            <th>Worlds</th>
            <th>Asserts</th>
            <th>DOM</th>
            <th>Resources</th>
            <th>Storage</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="state of data.states"
            :class="{
              state: true,
              'drop-target': isDropTarget(state.state),
            }"
            @drop="onDropSessionToState($event, state.state)"
            @dragenter="onDragSessionEnterState($event, state.state)"
            @dragover="onDragSessionOverState($event, state.state)"
            @click.prevent="focusState(state)"
          >
            <td class="text-left">
              <input
                class="name"
                :value="
                  editingStateName === state.state
                    ? editingStateNameValue ?? state.state
                    : state.state
                "
                @input="liveChangeStateName($event)"
                @change="changeStateName($event, state)"
                @focus="focusStateEditor($event, state)"
                @blur="blurStateEditor()"
              />
            </td>
            <td>{{ state.heroSessionIds.length }}</td>
            <td>{{ state.assertionCounts.total }}</td>
            <td>{{ state.assertionCounts.dom }}</td>
            <td>{{ state.assertionCounts.resources }}</td>
            <td>{{ state.assertionCounts.storage }}</td>
            <td style="width: 25px">
              <a class="remove-state" @click.stop="removeState(state)">X</a>
            </td>
          </tr>
          <tr>
            <td class="text-left">
              <button @click.prevent="addState()" id="add-state-button" class="app-button">
                <div class="icon"></div>
                <label>Add a State</label>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div id="multiverse-buttons">
        <button @click.prevent="spawnSession()" id="add-session-button" class="app-button">
          <div class="icon"></div>
          <label>Add a World</label>
        </button>
      </div>

      <div id="session-grid" v-if="needsAssignmentSessions.length || spawnedWorlds.length">
        <h5 v-if="needsAssignmentSessions.length">Unassigned Worlds</h5>
        <div
          v-for="session of needsAssignmentSessions"
          :class="{
            session: true,
            placeholder: session.id === 'placeholder',
            focused: session.id === focusedSessionId,
          }"
          :draggable="session.id !== 'placeholder'"
          @dragstart="onDragSession($event, session)"
          @dragend="onDragSessionEnd($event)"
        >
          <div
            class="session-preview"
            @click.prevent="focusOnSession(session)"
            :class="{ loading: !latestScreenshotsBySessionId[session.id] && session.isRunning }"
          >
            <img
              v-if="latestScreenshotsBySessionId[session.id]"
              class="screenshot"
              :src="latestScreenshotsBySessionId[session.id]"
            />
            <span class="times">{{ formattedTimeRange(session) }}</span>
          </div>
        </div>

        <h5 v-if="spawnedWorlds.length">Spawned Worlds</h5>
        <div
          v-for="session of spawnedWorlds"
          :class="{
            session: true,
            placeholder: session.id === 'placeholder',
            focused: session.id === focusedSessionId,
          }"
          :draggable="session.id !== 'placeholder'"
          @dragstart="onDragSession($event, session)"
          @dragend="onDragSessionEnd($event)"
        >
          <div
            class="session-preview"
            @click.prevent="focusOnSession(session)"
            :class="{ loading: !latestScreenshotsBySessionId[session.id] && session.isRunning }"
          >
            <img
              v-if="latestScreenshotsBySessionId[session.id]"
              class="screenshot"
              :src="latestScreenshotsBySessionId[session.id]"
            />
            <span class="times">{{ formattedTimeRange(session) }}</span>
          </div>

          <select>
            <option
              v-for="state of data.states"
              @click.prevent="moveSessionToState(session, state.state)"
              :selected="state.heroSessionIds.includes(session.id)"
            >
              {{ state.state }}
            </option>
          </select>
        </div>
      </div>

      <div id="buttonbar">
        <button
          @click.prevent="copyCode()"
          id="copy-code-button"
          class="app-button"
          :class="{ saving: saving }"
        >
          <div class="icon"></div>
          <label>{{ data.needsCodeChange ? 'Copy code' : 'Apply changes' }}</label>
        </button>
        <span id="save-message">{{ copiedToClipboard ? 'copied' : '   ' }}</span>

        <button @click.prevent="exit()" id="exit-button" class="app-button">
          <div class="icon"></div>
          <label>Exit</label>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import IPageStateUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IPageStateUpdatedEvent';
import * as screenshotCache from '@/utils/screenshotCache';
import Timeline from '@/components/Timeline.vue';
import TimelineHandle from '@/components/TimelineHandle.vue';
import FocusedState from '@/pages/pagestate-panel/views/FocusedState.vue';

function defaultData(): IPageStateUpdatedEvent {
  return {
    id: '',
    needsCodeChange: true,
    states: [],
    heroSessions: [],
  };
}

export default Vue.defineComponent({
  name: 'PageStatePanel',
  components: { Timeline, TimelineHandle, FocusedState },
  setup() {
    document.title = 'PageState Panel';

    return {
      data: Vue.reactive(defaultData()),
      focusedStateName: Vue.ref<string>(null),
      editingStateName: Vue.ref<string>(null),
      editingStateNameValue: Vue.ref<string>(null),
      focusedSessionId: Vue.ref<string>(null),
      latestScreenshotsBySessionId: Vue.reactive<Record<string, string>>({}),

      draggingSessionId: Vue.ref<string>(null),

      saving: Vue.ref(false),
      copiedToClipboard: Vue.ref(false),
      autoFocusedSessionsIds: new Set<string>(),
    };
  },
  computed: {
    droppableSessionStates(): string[] {
      if (!this.data?.heroSessions || !this.draggingSessionId) {
        return [];
      }
      return this.data.states
        .filter(x => !x.heroSessionIds.includes(this.draggingSessionId))
        .map(x => x.state);
    },
    focusedSession(): IPageStateUpdatedEvent['heroSessions'][0] {
      if (!this.data?.heroSessions) {
        return null;
      }
      return this.data.heroSessions.find(x => x.id === this.focusedSessionId);
    },
    primarySession(): IPageStateUpdatedEvent['heroSessions'][0] {
      return this.data?.heroSessions?.find(x => x.isPrimary);
    },
    focusedState(): IPageStateUpdatedEvent['states'][0] {
      return this.data.states.find(x => x.state === this.focusedStateName);
    },
    needsAssignmentSessions(): IPageStateUpdatedEvent['heroSessions'] {
      return this.data?.heroSessions?.filter(x => x.needsAssignment) ?? [];
    },
    spawnedWorlds(): IPageStateUpdatedEvent['heroSessions'] {
      return this.data?.heroSessions?.filter(x => x.isSpawnedWorld && !x.needsAssignment) ?? [];
    },
  },
  methods: {
    formattedTimeRange(session: IPageStateUpdatedEvent['heroSessions'][0]): string {
      const startSecs = this.formattedTime(session, true);
      const endSecs = this.formattedTime(session, false);

      return `${startSecs}-${endSecs}`;
    },

    formattedTime(session: IPageStateUpdatedEvent['heroSessions'][0], startTime = false): string {
      const begin = session.timelineRange[0];
      const time = startTime ? session.loadingRange[0] : session.loadingRange[1];
      let timestring = String(Math.floor((10 * (time - begin)) / 1e3) / 10);
      if (!timestring.includes('.')) timestring += '.0';
      return timestring + 's';
    },

    copyCode(): void {
      this.saving = true;
      Client.send('PageState.save').then(({ code }) => {
        this.saving = false;
        if (code) {
          navigator.clipboard.writeText(code);
          this.copiedToClipboard = true;
          setTimeout(() => (this.copiedToClipboard = false), 2e3);
        }
      });
    },

    focusStateEditor(event: FocusEvent, state: IPageStateUpdatedEvent['states'][0]): void {
      if (state.state === this.editingStateName) {
        (event.target as HTMLInputElement).select();
      }
      this.editingStateName = state.state;
      this.editingStateNameValue = state.state;
    },

    blurStateEditor(): void {
      this.editingStateName = null;
      this.editingStateNameValue = null;
    },

    liveChangeStateName(event: Event): void {
      this.editingStateNameValue = (event.target as HTMLInputElement).value;
    },

    changeStateName(event: Event, state: IPageStateUpdatedEvent['states'][0]): void {
      const name = (event.target as HTMLInputElement).value;
      Client.send('PageState.renameState', {
        state: name,
        oldValue: state.state,
      }).catch(alert);
      state.state = name;
      this.editingStateName = name;
      this.editingStateNameValue = name;
    },

    exit(): void {
      this.$emit('exit');
      Client.send('PageState.exit').catch(console.error);
    },

    unfocusState(): void {
      this.focusedStateName = null;
    },

    focusState(state: IPageStateUpdatedEvent['states'][0]): void {
      if (this.editingStateName || this.draggingSessionId) return;
      this.focusedStateName = state.state;
    },

    addState(state: string): void {
      if (!state) {
        let next = 1;
        while (this.data.states.some(x => x.state === `default-${next}`)) {
          next += 1;
        }
        state = `default-${next}`;
      }
      this.data.states.push({ state, heroSessionIds: [], assertionCounts: { total: 0 } });
      this.editingStateNameValue = state;
      this.editingStateName = state;
      Client.send('PageState.addState', { state, heroSessionIds: [] }).catch(alert);
    },

    spawnSession(): void {
      Client.send('PageState.spawnSession').catch(alert);
    },

    removeState(state: IPageStateUpdatedEvent['states'][0]): void {
      if (state.state === this.focusedStateName) {
        this.focusedStateName = null;
      }
      Client.send('PageState.removeState', { state: state.state }).catch(alert);
    },

    focusOnSession(
      focusedSession: IPageStateUpdatedEvent['heroSessions'][0],
      isAutomatedChange = false,
    ): void {
      if (focusedSession.id === 'placeholder') return;
      this.focusedSessionId = focusedSession.id;

      if (isAutomatedChange === false) {
        Client.send('PageState.openSession', { heroSessionId: focusedSession.id }).catch(alert);
      }
    },

    unfocusSession(): void {
      this.focusedSessionId = null;
      Client.send('PageState.unfocusSession').catch(alert);
    },

    onDragSession(event: DragEvent, session: IPageStateUpdatedEvent['heroSessions'][0]): void {
      this.draggingSessionId = session.id;
      event.dataTransfer.effectAllowed = 'move';

      // Add visual cues to show that the card is no longer in it's position.
      (event.target as any).style.opacity = 0.9;
    },

    onDragSessionEnd(event: DragEvent): void {
      (event.target as any).style.opacity = 1;
      this.draggingSessionId = null;
    },

    onDragSessionEnterState(event: DragEvent, stateName: string): void {
      if (this.isDropTarget(stateName)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }
    },

    onDragSessionOverState(event: DragEvent, stateName: string): void {
      if (this.isDropTarget(stateName)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }
    },

    isDropTarget(state: string): boolean {
      return this.droppableSessionStates.includes(state);
    },

    onDropSessionToState(event: DragEvent, stateName: string): void {
      event.stopPropagation();

      const sessionId = this.draggingSessionId;
      if (sessionId) {
        this.moveSessionToState(sessionId, stateName);
      }
    },

    moveSessionToState(sessionId: string, stateName: string): void {
      Client.send('PageState.addState', {
        state: stateName,
        heroSessionIds: [sessionId],
      }).catch(alert);

      const heroSession = this.data.heroSessions.find(x => x.id === sessionId);
      heroSession.needsAssignment = false;
      // update for ui while waiting
      for (const state of this.data.states) {
        const idx = state.heroSessionIds.indexOf(sessionId);
        if (idx >= 0) state.heroSessionIds.splice(idx, 1);

        if (idx === -1 && state.state === stateName) {
          state.heroSessionIds.push(sessionId);
        }
      }
    },

    onPageStateUpdatedEvent(message: IPageStateUpdatedEvent) {
      message ??= defaultData();
      Object.assign(this.data, message);

      const focusedSession = message.heroSessions.find(x => x.isFocused);

      if (focusedSession && !this.autoFocusedSessionsIds.has(focusedSession.id)) {
        this.autoFocusedSessionsIds.add(focusedSession.id);
        this.focusOnSession(focusedSession, true);
      }

      for (const session of this.data.heroSessions) {
        for (const screenshot of session.timeline.screenshots) {
          screenshotCache.process(session.id, screenshot);
        }
        const base64 = screenshotCache.closest(session.id, session.loadingRange[1]);
        if (base64)
          this.latestScreenshotsBySessionId[session.id] = `data:image/jpg;base64,${base64}`;
      }
    },
  },

  mounted() {
    Client.connect().catch(err => alert(String(err)));
    Client.on('PageState.updated', this.onPageStateUpdatedEvent);
  },

  beforeUnmount() {
    Client.off('PageState.updated', this.onPageStateUpdatedEvent);
  },
});
</script>

<style lang="scss">
@import '../../assets/style/common-mixins';
@import '../../assets/style/resets';

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

.app-button {
  cursor: pointer;
  position: relative;
  transition: 0.2s background-color;
  backface-visibility: hidden;
  margin: 0 5px;
  background-color: transparent;
  border-radius: 4px;
  border-width: 1px;
  padding: 2px 5px;

  &:disabled {
    background-color: var(--buttonActiveBackgroundColor);
  }

  &:active,
  &.selected {
    background-color: var(--buttonActiveBackgroundColor) !important;
  }

  &:hover {
    background-color: var(--buttonHoverBackgroundColor);
  }

  .label {
    margin-left: 8px;
  }

  .icon {
    width: 20px;
    height: 20px;
    display: inline-block;
    will-change: background-image;
    transition: 0.15s background-image;
    vertical-align: middle;
    backface-visibility: hidden;
    background-size: contain;
    background-repeat: no-repeat;
  }
}

.dragging-session #states .tab.focused {
  opacity: 0.6;
  box-shadow: none;
}

#manage-states {
  display: flex;
  flex-direction: column;
  flex: 1;
  flex-basis: 100%;
  justify-content: space-between;
  padding: 10px 10px 65px;
  position: relative;
  box-sizing: border-box;

  table {
    width: 100%;
    text-align: center;
    border-collapse: collapse;
    margin-top: 15px;
    font-size: 0.9em;
    font-family: ui-sans-serif;
    line-height: 0.8em;

    th {
      font-family: system-ui;
      min-width: 50px;
      font-weight: 200;
      font-size: 11px;
      color: #b5b5b5;
    }

    tr {
      text-align: center;
      border-bottom: 1px solid #eee;

      td {
        min-width: 50px;
        font-family: system-ui;
        font-weight: 200;
      }
      td.text-left {
        text-align: left;
      }
    }
  }

  .state {
    cursor: pointer;
    border-bottom: 0;

    &.focused,
    &:hover {
      background: white;
      box-shadow: 1px -1px 5px #ddd;

      .remove-state {
        display: inline;
      }
    }

    h2 {
      font-family: system-ui, sans-serif;
      font-size: 15px;
      margin: 20px 0 10px;
      color: #2d2d2d;
    }

    &.drop-target {
      box-shadow: 0 0 3pt 2px cornflowerblue;
    }

    input {
      border: 0 none;
      border-bottom: 2px solid transparent;
      background: transparent;
      margin: 10px;

      &:hover {
        border-bottom: 2px dotted #3c3c3c;
      }

      &:focus {
        font-weight: normal;
        border-bottom: 2px solid #3c3c3c;
      }
    }

    .remove-state {
      display: none;
      font-weight: bold;
      font-size: 0.9em;
      cursor: pointer;
    }

    &:focus-within .remove-state,
    &.drop-target .remove-state {
      display: none;
    }
  }

  #unmatched-sessions {
    flex: 1;
    flex-shrink: 2;
    flex-grow: 0;
    cursor: pointer;
    min-width: 150px;
    padding: 10px 20px;
    margin: 7px 10px 0;
    border-radius: 7px 6px 0 0;
    border: 1px dashed transparent;
    border-bottom: 0;
    position: relative;

    &:hover {
      border-color: darkgrey;
    }

    &.focused {
      border-color: #f1a33a;
      box-shadow: 1px -1px 5px #f1a33a55;

      h5 {
        font-size: 1.05em;
      }
    }

    h5 {
      text-transform: uppercase;
      font-style: italic;
      margin: 0;
      font-weight: bold;
      font-size: 12px;
    }

    .details {
      font-size: 0.9em;

      .pages {
        margin-right: 5px;
      }
    }
  }

  #add-state-button,
  #add-session-button {
    background: transparent;
    cursor: pointer;
    text-align: left;
    margin: 10px;
    border: 1px solid #ddd;

    label {
      margin-left: 5px;
      line-height: 18px;
      cursor: pointer;
    }

    .icon {
      cursor: pointer;
      width: 12px;
      height: 12px;
      background-image: url('~@/assets/icons/plus.svg');
    }
  }

  #multiverse-buttons {
    flex: 1;
    flex-shrink: 0;
    flex-wrap: nowrap;
    padding-top: 7px;
    margin-top: 25px;

    #add-session-button {
      .icon {
        filter: invert(100%);
        background-image: url('~@/assets/icons/pagestate.svg');
      }

      label {
        margin-left: 6px;
      }
    }
  }

  #buttonbar {
    flex: 1;
    position: absolute;
    bottom: 10px;
    left: 0;
    text-align: center;
    display: flex;
    justify-content: space-evenly;
    align-content: initial;
    width: 100%;
    padding: 0 10px;
    box-sizing: border-box;

    .app-button {
      margin-top: 3px;
      padding: 4px 10px;
      line-height: 20px;
      flex: 1;

      label {
        margin-left: 8px;
      }
    }

    #save-message {
      display: inline-block;
      width: 45px;
    }

    #copy-code-button .icon {
      vertical-align: middle;
      margin-top: 2px;
      background-image: url('~@/assets/icons/apply-changes.svg');
    }

    #exit-button {
      .icon {
        background-image: url('~@/assets/icons/exit.svg');
      }
    }
  }

  #session-grid {
    flex: 1;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;

    h5 {
      display: flex;
      box-sizing: border-box;
      margin: 20px 10px 5px;
      font-weight: normal;
      font-size: 0.9em;
      width: 100%;
    }

    .session {
      flex-direction: column;
    }
  }

  #primary-session {
    margin-bottom: 20px;
    border: 2px dashed #eee;
    border-radius: 15px;
    cursor: pointer;
    &.focused {
      box-shadow: 1px 1px 7px 3px #f1a33a50;
      border-color: #f1a33a;
      .session-preview {
        border-color: #59595950;
        box-shadow: none;
      }
    }
    .session-asserts {
      display: flex;
      padding: 5px 10px;
      flex-direction: column;
      flex: 1;
    }
    .session-name {
      margin: 5px 5px 0;
      font-weight: normal;
      display: block;
      flex: 1;
    }
    table {
      tr  {
        border-color: transparent;
      }
    }
  }

  .session {
    display: flex;
    flex-direction: row;

    select {
      padding: 2px;
      margin: 0 auto;
      width: 110px;
      border-color: #eee;
      color: #595959;
      font-size: 0.7em;
      display: block;
    }

    &.focused {
      .session-preview {
        border-color: #f1a33a;
        box-shadow: 1px 1px 7px 3px #f1a33a50;
      }
    }

    .session-preview {
      border: 1px solid #aaa;
      margin: 5px 10px;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 1px 1px 5px #ddd;
      flex-grow: 0;
      flex-shrink: 3;
      position: relative;
      cursor: pointer;
      height: 50px;
      width: 115px;

      .screenshot {
        -webkit-user-drag: none;
        display: flex;
        flex-shrink: 2;
        object-fit: cover;
        flex-grow: 0;
        object-position: top center;
        height: 100%;
        width: 100%;
      }

      .times {
        position: absolute;
        bottom: 3px;
        right: 5px;
        font-size: 11px;
      }

      &.loading {
        background-image: url('~@/assets/icons/loading-bars.svg');
        background-position: center;
        background-repeat: no-repeat;
        background-size: 20px;
        opacity: 0.5;
      }
    }
  }
}
</style>
