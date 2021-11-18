<template>
  <div class="Wrapper">
    <div class="State" v-for="state of states">
      <h2>
        {{ state.state }}
        <span class="assertions"
          >{{ sessionsByState[state.state]?.length || 0 }} page{{
            sessionsByState[state.state]?.length !== 1 ? 's' : ''
          }}, {{ state.assertionCounts.total }} asserts</span
        >
      </h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th></th>
            <th>Dom</th>
            <th>Resources</th>
            <th>Urls</th>
            <th>Storage</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-if="sessionsByState[state.state]"
            v-for="(session, i) of sessionsByState[state.state]"
          >
            <td>{{ i + 1 }}.</td>
            <td class="time-range">{{ formattedTimeRange(session) }}</td>
            <td>{{ session.assertionCounts.dom }}</td>
            <td>{{ session.assertionCounts.resources }}</td>
            <td>{{ session.assertionCounts.urls }}</td>
            <td>{{ session.assertionCounts.storage }}</td>
            <td>{{ session.assertionCounts.total }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th></th>
            <th></th>
            <th>{{ state.assertionCounts.dom }}</th>
            <th>{{ state.assertionCounts.resources }}</th>
            <th>{{ state.assertionCounts.urls }}</th>
            <th>{{ state.assertionCounts.storage }}</th>
            <th>{{ state.assertionCounts.total }}</th>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import IPageStateUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IPageStateUpdatedEvent';

export default Vue.defineComponent({
  name: 'PageStatePanel',
  components: {},
  setup() {
    let states = Vue.reactive<IPageStateUpdatedEvent['states']>([]);
    let sessionsByState = Vue.reactive<Record<string, IPageStateUpdatedEvent['heroSessions']>>({});

    function onPageStateUpdated(data: IPageStateUpdatedEvent) {
      states.length = 0;
      for (const key of Object.keys(sessionsByState)) {
        delete sessionsByState[key];
      }
      if (!data) return;
      Object.assign(states, data.states);
      for (const state of data.states) {
        sessionsByState[state.state] = data.heroSessions.filter(x =>
          state.heroSessionIds.includes(x.id),
        );
      }
    }

    Vue.onMounted(() => {
      Client.on('PageState.updated', event => onPageStateUpdated(event));
    });

    Client.connect().catch(err => alert(String(err)));
    document.title = 'PageState Panel';

    return { states, sessionsByState };
  },
  methods: {
    formattedTimeRange(session: IPageStateUpdatedEvent['heroSessions'][0]): string {
      const begin = session.timelineRange[0];
      const [start, end] = session.loadingRange;
      let startSecs = String(Math.floor((10 * (start - begin)) / 1e3) / 10);
      if (!startSecs.includes('.')) startSecs += '.0';

      let endSecs = String(Math.floor((10 * (end - begin)) / 1e3) / 10);
      if (!endSecs.includes('.')) endSecs += '.0';

      return `${startSecs}s-${endSecs}s`;
    },
  },
});
</script>

<style lang="scss">
@import '../../assets/style/common-mixins';
@import '../../assets/style/resets';

:root {
  --toolbarBackgroundColor: #f5faff;
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

.State {
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
    margin: 20px 0 10px;
    color: #2d2d2d;
  }

  .assertions {
    font-size: 0.8em;
    font-style: italic;
    font-weight: normal;
    margin-left: 5px;
  }

  table {
    width: 100%;
    text-align: center;
    border-collapse: collapse;
    font-size: 0.9em;
    font-family: ui-sans-serif;
    box-shadow: 1px 1px 2px #aaa, -1px -1px 3px #aaa;

    .time-range {
      padding: 0 5px;
      font-style: italic;
      font-size: 0.9em;
    }

    th {
      background: rgba(245, 250, 255, 0.67);
      padding: 5px;
      font-size: 0.9em;
      font-weight: 500;
    }
    tfoot th {
      border-top: 1px solid #eee;
    }
    thead th {
      border-bottom: 1px solid #eee;
    }
  }
}
</style>
