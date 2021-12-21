<template>
  <div id="focused-state" v-if="state">
    <div class="header">
      <a href="javascript:void(0)" id="unfocus-state" @click.prevent="goBack()">&lt; back</a>
      <h5 class="state-name">{{ state.state }}</h5>

      <table class="asserts">
        <thead>
          <tr>
            <th>Asserts</th>
            <th>DOM</th>
            <th>Resources</th>
            <th>Storage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ state.assertionCounts.total }}</td>
            <td>{{ state.assertionCounts.dom }}</td>
            <td>{{ state.assertionCounts.resources }}</td>
            <td>{{ state.assertionCounts.storage }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div id="state-session-grid" class="session-grid">
      <div
        v-for="session of sessions"
        :class="{
          'state-session': true,
          focused: session.id === focusedSessionId,
        }"
      >
        <div class="left-panel">
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
            <h5 class="session-name">{{ session.name }}</h5>
          </div>

          <select @change="moveSessionToState(session.id, $event.target.value)">
            <option
              v-for="state of states"
              :value="state.state"
              :selected="state.heroSessionIds.includes(session.id)"
            >
              {{ state.state }}
            </option>
          </select>
        </div>
        <div class="session-details" @click.prevent="focusOnSession(session)">
          <Timeline :hero-session-id="session.id" :timeline="session.timeline" :ticks="[]">
            <div
              class="drag-range"
              :style="{
                left: `calc(${session.timelineOffsetPercents[0]}% - 11px)`,
                width: `calc(${
                  session.timelineOffsetPercents[1] - session.timelineOffsetPercents[0]
                }% + 21px)`,
              }"
            >
              <span class="start-time">{{ formattedTime(session, true) }}</span>
              <TimelineHandle class="dragLeft"></TimelineHandle>
              <TimelineHandle class="dragRight"></TimelineHandle>
              <span class="end-time">{{ formattedTime(session, false) }}</span>
            </div>
          </Timeline>

          <table class="asserts">
            <thead>
              <tr>
                <th>Asserts</th>
                <th>DOM</th>
                <th>Resources</th>
                <th>Storage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{{ session.assertionCounts.total }}</td>
                <td>{{ session.assertionCounts.dom }}</td>
                <td>{{ session.assertionCounts.resources }}</td>
                <td>{{ session.assertionCounts.storage }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-if="unloadableSessionCount > 0" id="unloaded-worlds-message">
        {{ unloadableSessionCount }} other world{{ unloadableSessionCount !== 1 ? 's' : '' }}
        are unavailable to display.
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import IPageStateUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IPageStateUpdatedEvent';
import Timeline from '@/components/Timeline.vue';
import TimelineHandle from '@/components/TimelineHandle.vue';

export default Vue.defineComponent({
  name: 'FocusedStatePanel',
  components: { Timeline, TimelineHandle },
  emits: ['back'],
  props: {
    focusedStateName: String,
    focusedSessionId: String,
    latestScreenshotsBySessionId: Object,
    focusOnSession: Function,
  },
  setup() {
    return {
      states: Vue.reactive<IPageStateUpdatedEvent['states']>([]),
      heroSessions: Vue.reactive<IPageStateUpdatedEvent['heroSessions']>([]),
    };
  },
  computed: {
    unloadableSessionCount(): number {
      if (!this.focusedStateName) {
        return 0;
      }

      const heroSessionIds = this.state?.heroSessionIds?.length || 0;

      return heroSessionIds - this.sessions.length;
    },
    sessions(): IPageStateUpdatedEvent['heroSessions'] {
      if (!this?.heroSessions || !this.focusedStateName) {
        return [];
      }

      const heroSessionIds = new Set<string>(this.state?.heroSessionIds ?? []);

      return this.heroSessions.filter(x => heroSessionIds.has(x.id));
    },
    state(): IPageStateUpdatedEvent['states'][0] {
      return this.states.find(x => x.state === this.focusedStateName);
    },
  },
  methods: {
    formattedTime(session: IPageStateUpdatedEvent['heroSessions'][0], startTime = false): string {
      const begin = session.timelineRange[0];
      const time = startTime ? session.loadingRange[0] : session.loadingRange[1];
      let timestring = String(Math.floor((10 * (time - begin)) / 1e3) / 10);
      if (!timestring.includes('.')) timestring += '.0';
      return timestring + 's';
    },

    goBack(): void {
      this.$emit('back');
    },

    moveSessionToState(sessionId: string, stateName: string): void {
      Client.send('PageState.addState', {
        state: stateName,
        heroSessionIds: [sessionId],
      }).catch(alert);

      if (stateName !== this.focusedStateName) {
        const idx = this.state.heroSessionIds.indexOf(sessionId);
        if (idx >= 0) this.state.heroSessionIds.splice(idx, 1);
      }
    },

    onPageStateUpdatedEvent(message: IPageStateUpdatedEvent) {
      this.states.length = message?.states?.length ?? 0;
      this.heroSessions.length = message?.heroSessions?.length ?? 0;

      if (message) {
        Object.assign(this.states, message.states);
        Object.assign(this.heroSessions, message.heroSessions);
      }
    },
  },

  mounted() {
    Client.on('PageState.updated', this.onPageStateUpdatedEvent);
  },

  beforeUnmount() {
    Client.off('PageState.updated', this.onPageStateUpdatedEvent);
  },
});
</script>

<style lang="scss">
@import '../../../assets/style/common-mixins';
@import '../../../assets/style/resets';

.dragging-session #states .tab.focused {
  opacity: 0.6;
  box-shadow: none;
}

#focused-state {
  .header {
    padding: 10px;
    border-bottom: 1px solid;
    margin-bottom: 15px;

    a#unfocus-state {
      display: inline-block;
      font-size: 0.9em;
      color: #595959;
      text-decoration: none;
    }

    .state-name {
      display: inline-block;
      font-size: 1em;
      margin: 0 10px;
    }

    table.asserts {
      top: -10px;
      position: relative;
    }
  }

  table.asserts {
    flex-grow: 0;
    text-align: center;
    width: 150px;
    font-size: 0.8em;
    float: right;
    line-height: 0.8em;
    margin: 5px auto;

    th {
      font-weight: normal;
      font-size: 11px;
      color: #b5b5b5;
    }

    th,
    td {
      min-width: 50px;
      font-family: system-ui;
      font-weight: 200;
    }
  }

  #state-session-grid {
    flex-direction: column;
    flex: 1;
    display: flex;
    flex-wrap: wrap;

    h5 {
      display: flex;
      box-sizing: border-box;
      margin: 20px 10px 5px;
      font-weight: normal;
      font-size: 0.9em;
      width: 100%;
    }

    .state-session {
      display: flex;
      flex-direction: row;
      border-bottom: 1px solid #eee;
      padding: 10px 0;

      &.focused {
        border-left: 4px solid #f1a33a;
        box-shadow: 0 1px 5px 5px #59595950;
      }

      .left-panel {
        flex-grow: 0;
        flex-direction: column;
        justify-content: stretch;

        select {
          padding: 2px;
          margin: 0 auto;
          width: 110px;
          border-color: #eee;
          color: #595959;
          font-size: 0.7em;
          display: block;
        }
      }

      .session-details {
        flex: 1;
        cursor: pointer;

        table.asserts {
          border-top: 1px dashed #eee;
          padding-top: 5px;
          margin-right: 12px;
          margin-top: 10px;
        }
      }

      .session-preview {
        flex-grow: 0;
        flex-shrink: 3;
        position: relative;
        cursor: pointer;
        height: 50px;
        width: 115px;
        border: 1px solid #aaa;
        margin: 5px 10px;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 1px 1px 5px #ddd;

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

        &.loading {
          background-image: url('~@/assets/icons/loading-bars.svg');
          background-position: center;
          background-repeat: no-repeat;
          background-size: 20px;
          opacity: 0.5;
        }
      }
    }

    .timeline {
      padding: 0;

      .bar {
        padding-top: 0;
        padding-left: 17px;
        padding-right: 17px;

        .track {
          top: 14px;
          position: relative;
        }
      }

      .drag-range {
        top: -7px;
        height: 26px;
        border: 5px solid #f1a33a;
        position: absolute;
        box-sizing: border-box;
        border-radius: 14px;
        min-width: 41px;

        .dragLeft,
        .dragRight {
          position: absolute;
          cursor: default;
          top: 0;
          width: 5px;
          background: #f1a33a;
          height: 100%;
        }

        .dragLeft {
          left: 0;
        }

        .dragRight {
          right: 0;
        }

        .start-time,
        .end-time {
          font-size: 12px;
          color: #595959;
          position: absolute;
          bottom: -20px;
        }

        .start-time {
          left: -5px;
        }

        .end-time {
          right: -5px;
        }
      }
    }

    #unloaded-worlds-message {
      text-align: center;
      font-size: 0.9em;
      margin: 5px 0;
      font-style: italic;
    }
  }
}
</style>
