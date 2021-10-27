<template>
  <div id="GeneratorPage">
    <div
      id="chrome-alive-bar"
      ref="toolbarDiv"
      :class="{ 'dragging-session': !!draggingSessionId }"
    >
      <div id="topbar">
        <div
          v-for="state of data.states"
          :class="{
            tab: true,
            focused: focusedState === state.state,
            'drop-target': isDropTarget(state.state),
          }"
          @drop="onDropSessionToTab($event, state.state)"
          @dragenter="onDragSessionEnterTab($event, state.state)"
          @dragover="onDragSessionOverTab($event, state.state)"
          @click.prevent="focusState(state)"
        >
          <input
            class="name"
            :value="editingState === state.state ? editingStateValue ?? state.state : state.state"
            @input="liveChangeState($event)"
            @change="changeState($event, state)"
            @focus="focusStateEditor($event, state)"
            @blur="blurStateEditor()"
          />
          <div class="details">
            <span class="pages"
              >{{ state.heroSessionIds.length }} page{{
                state.heroSessionIds.length !== 1 ? 's' : ''
              }}</span
            >
            <span class="asserts"
              >{{ state.assertionCounts.total }} assert{{
                state.assertionCounts.total !== 1 ? 's' : ''
              }}</span
            >
          </div>
          <a class="remove-state" @click.prevent="removeState(state)">X</a>
        </div>

        <div
          v-if="data.unresolvedHeroSessionIds.length"
          id="unmatched-sessions"
          :class="{ focused: focusedState === null }"
          @click.prevent="focusOnUnresolved()"
        >
          <h5>Unmatched</h5>
          <div class="details">
            <span class="pages"
              >{{ data.unresolvedHeroSessionIds.length }} page{{
                data.unresolvedHeroSessionIds.length !== 1 ? 's' : ''
              }}</span
            >
          </div>
        </div>

        <div id="multiverse-buttons">
          <button @click.prevent="addState()" id="add-state-button" class="app-button">
            <div class="icon"></div>
          </button>

          <button @click.prevent="spawnSession()" id="add-session-button" class="app-button">
            <div class="icon"></div>
          </button>
        </div>

        <div id="buttons-right">
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
      <div id="session-bar" :class="{ listview: !focusedSession }">
        <div id="focused-session" v-if="focusedSession">
          <div
            class="session-preview"
            @click="unfocusSession()"
            :class="{ loading: !latestScreenshotsBySessionId[focusedSession.id] }"
          >
            <img
              v-if="latestScreenshotsBySessionId[focusedSession.id]"
              class="screenshot"
              :src="latestScreenshotsBySessionId[focusedSession.id]"
            />
            <span class="times">{{ formattedTimeRange(focusedSession) }}</span>
          </div>

          <Timeline
            @hover="onTimelineHover"
            @mouseout="onTimelineMouseout"
            :active-tick-index="timelineUrlIndex"
            :hero-session-id="focusedSessionId"
            :timeline="focusedSession.timeline"
            :ticks="timelineTicks"
            ref="timelineRef"
          >
            <div
              id="drag-range"
              :style="{
                left: timelineOffsetLeft + '%',
                width: timelineOffsetRight - timelineOffsetLeft + '%',
              }"
            >
              <TimelineHandle
                id="dragLeft"
                @dragstart="timelineHandleDragstart"
                @dragend="timelineHandleDragend"
                @drag="leftTimelineHandleDrag"
              ></TimelineHandle>

              <TimelineHandle
                id="dragRight"
                @dragstart="timelineHandleDragstart"
                @dragend="timelineHandleDragend"
                @drag="rightTimelineHandleDrag"
              ></TimelineHandle>
            </div>
          </Timeline>
          <div class="button-panel">
            <button @click.prevent="unfocusSession()" id="unfocus-session" class="app-button">
              <div class="icon"></div>
            </button>
          </div>
        </div>
        <div
          v-else-if="focusedStateSessions.length"
          v-for="session of focusedStateSessions"
          :class="{ 'state-session': true, placeholder: session.id === 'placeholder' }"
          :draggable="session.id !== 'placeholder'"
          @dragstart="onDragSession($event, session)"
          @dragend="onDragSessionEnd($event)"
        >
          <div
            class="session-preview"
            @click.prevent="focusOnSession(session)"
            :class="{ loading: !latestScreenshotsBySessionId[session.id] }"
          >
            <img
              v-if="latestScreenshotsBySessionId[session.id]"
              class="screenshot"
              :src="latestScreenshotsBySessionId[session.id]"
            />
            <span class="times">{{ formattedTimeRange(session) }}</span>
          </div>
        </div>
        <div v-else>
          <h5>No Matching Pages</h5>
        </div>
      </div>
    </div>
    <TimelineHover
      :style="{ display: showTimelineHover ? 'flex' : 'none' }"
      :runtimeMs="focusedTimelineMs()"
      :hoverEvent="timelineHover"
    ></TimelineHover>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import Timeline, { ITimelineHoverEvent, ITimelineTick } from '@/components/Timeline.vue';
import IPageStateUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IPageStateUpdatedEvent';
import * as screenshotCache from '@/utils/screenshotCache';
import TimelineHandle from '@/components/TimelineHandle.vue';
import TimelineHover from '@/components/TimelineHover.vue';

function defaultData(): IPageStateUpdatedEvent {
  return {
    id: '',
    focusedHeroSessionId: '',
    needsCodeChange: true,
    states: [],
    unresolvedHeroSessionIds: [],
    heroSessions: [],
  };
}

export default Vue.defineComponent({
  name: 'PageStateGenerator',
  components: { Timeline, TimelineHover, TimelineHandle },
  props: {
    pageStateId: String,
  },
  emits: ['exit', 'bounds-changed'],
  setup(props, ctx) {
    let toolbarDiv = Vue.ref<HTMLDivElement>();
    let boundsMonitor = new ResizeObserver(ev => {
      if (!ev.length) return;
      ctx.emit('bounds-changed', ev[0].target);
    });

    return {
      timelineHover: Vue.reactive({} as ITimelineHoverEvent),
      showTimelineHover: Vue.ref(false),

      detailsWindow: Vue.ref<Window>(null),

      toolbarDiv,
      boundsMonitor,

      pendingTimetravelOffset: null as number,
      pendingTimetravelIsStart: false,

      data: Vue.reactive(defaultData()),
      focusedState: Vue.ref<string>(null),
      editingState: Vue.ref<string>(null),
      editingStateValue: Vue.ref<string>(null),
      focusedSessionId: Vue.ref<string>(null),
      timelineUrlIndex: Vue.ref<Number>(null),
      timelineOffsetLeft: Vue.ref<Number>(0),
      timelineOffsetRight: Vue.ref<Number>(100),
      timelineRef: Vue.ref<typeof Timeline>(),
      isDraggingTimelineHandle: Vue.ref(false),

      latestScreenshotsBySessionId: Vue.reactive<Record<string, string>>({}),

      draggingSessionId: Vue.ref<string>(null),

      saving: Vue.ref(false),
      copiedToClipboard: Vue.ref(false),
    };
  },
  watch: {
    'data.id'(newPageStateId: string) {
      if (!newPageStateId) this.closeDetailsWindow();
      else if (newPageStateId) this.openDetailsWindow();
    },
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
    focusedStateSessions(): IPageStateUpdatedEvent['heroSessions'] {
      if (!this.data?.heroSessions) {
        return [];
      }

      let heroSessionIds = this.data.unresolvedHeroSessionIds;
      if (this.focusedState)
        heroSessionIds =
          this.data.states.find(x => x.state === this.focusedState)?.heroSessionIds ?? [];

      return this.data.heroSessions.filter(x => heroSessionIds.includes(x.id));
    },
    timelineTicks(): ITimelineTick[] {
      const focusedSession = this.focusedSession;
      if (!focusedSession) return [];
      return focusedSession.timeline.urls.map(x => {
        return {
          id: x.navigationId,
          offsetPercent: x.offsetPercent,
          class: 'url',
        };
      });
    },
  },
  methods: {
    formattedTimeRange(session: IPageStateUpdatedEvent['heroSessions'][0]): string {
      const begin = session.timelineRange[0];
      const [start, end] = session.loadingRange;
      const startSecs = Math.floor((10 * (start - begin)) / 1e3) / 10;
      const endSecs = Math.floor((10 * (end - begin)) / 1e3) / 10;
      return `${startSecs}s-${endSecs}s`;
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

    exit(): void {
      this.$emit('exit');
    },

    focusOnUnresolved(): void {
      this.focusedState = null;
      this.unfocusSession();
    },

    focusState(state: IPageStateUpdatedEvent['states'][0]): void {
      if (this.editingState) return;
      this.focusedState = state.state;
      this.unfocusSession();
    },

    focusStateEditor(event: FocusEvent, state: IPageStateUpdatedEvent['states'][0]): void {
      if (state.state === this.editingState) {
        (event.target as HTMLInputElement).select();
      }
      this.editingState = state.state;
      this.editingStateValue = state.state;
    },

    blurStateEditor(): void {
      this.editingStateValue = null;
    },

    liveChangeState(event: Event): void {
      this.editingStateValue = (event.target as HTMLInputElement).value;
    },

    changeState(event: Event, state: IPageStateUpdatedEvent['states'][0]): void {
      const name = (event.target as HTMLInputElement).value;
      Client.send('PageState.renameState', {
        state: name,
        oldValue: state.state,
      }).catch(alert);
      state.state = name;
      this.editingState = name;
      this.editingStateValue = name;
      this.focusedState = name;
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
      this.editingStateValue = state;
      Client.send('PageState.addState', { state, heroSessionIds: [] }).catch(alert);
    },

    spawnSession(): void {
      Client.send('PageState.spawnSession').catch(alert);
    },

    removeState(state: IPageStateUpdatedEvent['states'][0]): void {
      Client.send('PageState.removeState', state).catch(alert);
    },

    focusOnSession(focusedSession: IPageStateUpdatedEvent['heroSessions'][0]): void {
      if (focusedSession.id === 'placeholder') return;

      const isChangingSession = this.focusedSessionId !== focusedSession.id;
      this.focusedSessionId = focusedSession.id;
      if (isChangingSession) {
        this.timelineOffsetLeft = focusedSession.timelineOffsetPercents[0];
        this.timelineOffsetRight = focusedSession.timelineOffsetPercents[1];
        this.showTimelineHover = false;
        Client.send('PageState.openSession', { heroSessionId: focusedSession.id }).catch(alert);
      }
    },

    unfocusSession(): void {
      this.focusedSessionId = null;
      if (
        !this.focusedState &&
        !this.data.unresolvedHeroSessionIds.length &&
        this.data.states.length
      ) {
        this.focusState(this.data.states[0]);
      }
      Client.send('PageState.unfocusSession').catch(alert);
    },

    onDragSession(event: DragEvent, session: IPageStateUpdatedEvent['heroSessions'][0]): void {
      this.draggingSessionId = session.id;
      event.dataTransfer.setData('sessionId', session.id);
      event.dataTransfer.effectAllowed = 'move';

      // Add visual cues to show that the card is no longer in it's position.
      (event.target as any).style.opacity = 0.9;
    },

    onDragSessionEnd(event: DragEvent): void {
      (event.target as any).style.opacity = 1;
      this.draggingSessionId = null;
    },

    onDragSessionEnterTab(event: DragEvent, stateName: string): void {
      if (this.isDropTarget(stateName)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }
    },

    onDragSessionOverTab(event: DragEvent, stateName: string): void {
      if (this.isDropTarget(stateName)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }
    },

    isDropTarget(state: string): boolean {
      return this.droppableSessionStates.includes(state);
    },

    onDropSessionToTab(event: DragEvent, stateName: string): void {
      event.stopPropagation();

      const sessionId = event.dataTransfer.getData('sessionId');
      if (sessionId) {
        Client.send('PageState.addState', {
          state: stateName,
          heroSessionIds: [sessionId],
        }).catch(alert);

        const idx = this.data.unresolvedHeroSessionIds.indexOf(sessionId);
        if (idx >= 0) this.data.unresolvedHeroSessionIds.splice(idx, 1);
        const focusOnState =
          this.focusedState === null && this.data.unresolvedHeroSessionIds.length === 0;
        // update for ui while waiting
        for (const state of this.data.states) {
          const idx = state.heroSessionIds.indexOf(sessionId);
          if (idx >= 0) state.heroSessionIds.splice(idx, 1);

          if (idx === -1 && state.state === stateName) {
            state.heroSessionIds.push(sessionId);
            if (focusOnState) {
              this.focusState(state);
            }
          }
        }
      }
    },

    focusedTimelineMs(): number {
      const session = this.focusedSession;
      if (session?.timelineRange?.length)
        return session.timelineRange[1] - session.timelineRange[0];
      return 0;
    },

    timelineHandleDragstart(): void {
      this.isDraggingTimelineHandle = true;
    },

    timelineHandleDragend(): void {
      if (!this.isDraggingTimelineHandle) return;
      this.isDraggingTimelineHandle = false;
      this.updateSessionTimes().catch(console.error);
    },

    leftTimelineHandleDrag(event: MouseEvent): void {
      const value = this.timelineRef.getTrackOffset(event);
      // don't allow overlap
      if (value + 1 >= this.timelineOffsetRight) return;

      if (this.focusedSessionId && value !== this.timelineOffsetLeft) {
        this.pendingTimetravelOffset = value;
        this.pendingTimetravelIsStart = true;
      }
      this.timelineOffsetLeft = value;
    },

    rightTimelineHandleDrag(event: MouseEvent): void {
      const value = this.timelineRef.getTrackOffset(event);
      // don't allow overlap
      if (value - 1 <= this.timelineOffsetLeft) return;

      if (this.focusedSessionId && value !== this.timelineOffsetRight) {
        this.pendingTimetravelOffset = value;
        this.pendingTimetravelIsStart = false;
      }
      this.timelineOffsetRight = value;
    },

    onTimelineHover(hoverEvent: ITimelineHoverEvent): void {
      Object.assign(this.timelineHover, hoverEvent);
      this.showTimelineHover = true;
    },

    onTimelineMouseout(): void {
      if (this.isDraggingTimelineHandle) return;
      this.showTimelineHover = false;
    },

    async updateSessionTimes() {
      if (this.pendingTimetravelOffset === null) return;
      const percentOffset = this.pendingTimetravelOffset;
      this.pendingTimetravelOffset = null;
      await Client.send('PageState.modifySessionTimes', {
        heroSessionId: this.focusedSessionId,
        isStartTime: this.pendingTimetravelIsStart,
        timelineOffset: percentOffset,
      });
    },

    onPageStateUpdatedEvent(message: IPageStateUpdatedEvent) {
      message ??= defaultData();
      Object.assign(this.data, message);
      if (message.focusedHeroSessionId) {
        const focusedSession = message.heroSessions.find(
          x => x.id === message.focusedHeroSessionId,
        );
        this.focusOnSession(focusedSession);
      }

      for (const session of this.data.heroSessions) {
        for (const screenshot of session.timeline.screenshots) {
          const hasScreenshots = screenshotCache.latest(session.id);
          const isInRange =
            screenshot.timestamp >= session.timelineRange[0] &&
            screenshot.timestamp <= session.timelineRange[1];
          if (!hasScreenshots || isInRange) {
            screenshotCache.process(session.id, screenshot);
          }
        }
        const base64 = screenshotCache.closest(session.id, session.loadingRange[1]);
        if (base64)
          this.latestScreenshotsBySessionId[session.id] = `data:image/jpg;base64,${base64}`;
      }
    },

    closeDetailsWindow() {
      if (this.detailsWindow) {
        this.detailsWindow.close();
        this.detailsWindow = null;
      }
    },

    openDetailsWindow() {
      if (this.detailsWindow) return;
      const { bottom, right } = this.toolbarDiv.getBoundingClientRect();
      const [width, height] = (localStorage.getItem('pageState.lastSize') ?? '350,400')
        .split(',')
        .map(Number);
      const features = `top=${bottom + 100},left=${
        right - width - 40
      },width=${width},height=${height}`;
      this.detailsWindow = window.open('/pagestate-panel.html', 'PageStatePanel', features);

      this.detailsWindow.addEventListener('resize', ev => {
        const width = this.detailsWindow.innerWidth;
        const height = this.detailsWindow.innerHeight;
        localStorage.setItem('pageState.lastSize', [width, height].join(','));
      });
      this.detailsWindow.addEventListener('close', () => {
        this.detailsWindow = null;
      });
      this.detailsWindow.addEventListener('manual-close', () => {
        this.detailsWindow = null;
      });
    },
  },

  mounted() {
    Client.on('PageState.updated', this.onPageStateUpdatedEvent);
    Client.send('PageState.load', {
      pageStateId: this.pageStateId,
    });
    this.boundsMonitor.observe(this.toolbarDiv);
    this.$emit('bounds-changed', this.toolbarDiv);
  },

  beforeUnmount() {
    Client.off('PageState.updated', this.onPageStateUpdatedEvent);
    this.boundsMonitor.unobserve(this.toolbarDiv);
    this.closeDetailsWindow();
  },
});
</script>

<style lang="scss">
@import '../../../assets/style/resets.scss';

#GeneratorPage {
  #chrome-alive-bar {
    padding-top: 2px;
    padding-bottom: 2px;
    background-color: #f5faff;
    box-shadow: 0 0 1px rgba(0, 0, 0, 0.12), 0 1px 1px rgba(0, 0, 0, 0.16);
    border: 1px solid rgba(0, 0, 0, 0.2);
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
    -webkit-app-region: no-drag;
    transition: opacity 20ms ease-in;
    height: 120px;
  }

  .app-button {
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

  .dragging-session #topbar .tab.focused {
    opacity: 0.6;
    box-shadow: none;
  }

  #topbar {
    display: flex;
    flex-direction: row;
    flex: 1;
    flex-basis: 100%;
    justify-content: space-between;
    margin: 0;
    border-bottom: 2px solid #aaa;
    max-height: 50%;

    .tab {
      flex: 1;
      flex-shrink: 2;
      flex-grow: 0;
      cursor: pointer;
      min-width: 150px;
      padding: 10px 20px;
      margin: 7px 10px 0;
      border-radius: 7px 6px 0 0;
      border: 1px solid darkgrey;
      border-bottom: 0;
      position: relative;
      &.focused {
        background: white;
        box-shadow: 1px -1px 5px #ddd;
        .remove-state {
          display: inline;
        }
      }
      &.drop-target {
        box-shadow: 0 0 3pt 2px cornflowerblue;
      }
      input {
        border: 0 none;
        border-bottom: 2px solid transparent;
        background: transparent;
        margin: -2px -2px 0;
        padding: 2px;
        font-weight: bold;
        font-size: 12px;
        &:hover {
          border-bottom: 2px dotted #3c3c3c;
        }
        &:focus {
          font-weight: normal;
          border-bottom: 2px solid #3c3c3c;
        }
      }
      .details {
        font-size: 0.9em;
        .pages {
          margin-right: 5px;
        }
      }
      .remove-state {
        display: none;
        position: absolute;
        right: 7px;
        top: 7px;
        font-weight: bold;
        font-size: 0.9em;
        cursor: pointer;
      }
      &.focused:focus-within .remove-state {
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
        border-color: darkgrey;
        box-shadow: 1px -1px 5px #ddd;
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

    #multiverse-buttons {
      flex: 1;
      flex-shrink: 0;
      flex-wrap: nowrap;
      padding-top: 7px;
      margin-top: 5px;

      #add-state-button {
        margin-right: 40px;
        background: transparent;
        cursor: pointer;
        border: 0 none;

        .icon {
          width: 22px;
          height: 22px;
          background-image: url('~@/assets/icons/plus.svg');
        }
      }

      #add-session-button .icon {
        filter: invert(100%);
        width: 30px;
        height: 30px;
        background-image: url('~@/assets/icons/pagestate.svg');
      }
    }

    #buttons-right {
      justify-content: end;
      flex: 1;
      align-content: end;
      text-align: right;
      padding: 8px;

      .app-button {
        margin-top: 3px;
        padding: 4px 10px;
        line-height: 20px;

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
        margin: 0 20px;
        .icon {
          background-image: url('~@/assets/icons/exit.svg');
        }
      }
    }
  }

  #session-bar {
    flex: 1;
    display: flex;
    flex-direction: row;
    max-height: 50%;
    &.listview {
      flex-grow: 0;
    }

    h5 {
      display: block;
      margin: 10px 20px;
      flex-shrink: 0;
      font-weight: normal;
      font-style: italic;
      font-size: 0.9em;
      text-transform: uppercase;
    }

    .session-preview {
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
    }

    .state-session {
      .session-preview {
        border: 1px solid #aaa;
        margin: 5px 10px;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 1px 1px 5px #ddd;

        &.loading {
          background-image: url('~@/assets/icons/loading-bars.svg');
          background-position: center;
          background-repeat: no-repeat;
          background-size: 20px;
          opacity: 0.5;
        }
      }
    }

    #focused-session {
      display: flex;
      border: 1px solid #aaa;
      margin: 5px 20% 5px 10px;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 1px 1px 5px #ddd;
      flex-direction: row;
      flex: 1;

      #timeline {
        #bar {
          padding-top: 0;
          #track {
            top: 14px;
            position: relative;
          }
        }
      }

      #drag-range {
        top: -17px;
        height: 43px;
        border: 7px solid #f1a33a;
        box-shadow: 1px 1px 2px #000, inset 1px 1px 2px #000;
        position: absolute;
        box-sizing: border-box;
        border-radius: 14px;
        overflow: hidden;
        min-width: 41px;

        #dragLeft,
        #dragRight {
          cursor: grab;
          position: absolute;
          top: 0;
          width: 20px;
          background: #f1a33a;
          height: 100%;

          &:active {
            cursor: grabbing;
          }
        }
        #dragLeft {
          left: 0;
        }
        #dragRight {
          right: 0;
        }
      }

      #unfocus-session {
        border: 0 none;
        height: 100%;

        .icon {
          height: 100%;
          width: 15px;
          background-image: url('~@/assets/icons/arrow-left.svg');
          border: 0 none;
          background-position: center;
          background-size: cover;
          color: #ddd;
          filter: opacity(0.3);
        }
      }
    }
  }
}
</style>
