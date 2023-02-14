<template>
  <div class="Menu">
    <ul>
      <li class="info">
        Chrome is bound to <strong>{{ scriptEntrypoint }}</strong>, a <strong>Hero</strong> script wrapped as a <strong>Datastore</strong>.
      </li>
      <li class="separator" />
      <li class="item" @click.prevent="continueScript">
        Continue Script Execution
      </li>
      <li class="item" @click.prevent="restartScript">
        Replay from Beginning of Script
      </li>
      <li class="separator" />
      <li class="item-wrapper flex flex-row">
        <div class="flex-1">
          Open In {{ fileOsTool() }}
        </div>
        <div class="item" @click.prevent="openScript(scriptEntrypointRaw)">
          Executed JS
        </div>
        <div
          v-if="scriptEntrypointTs"
          class="item"
          @click.prevent="openScript(scriptEntrypointTs)"
        >
          Source TS
        </div>
      </li>
      <li class="separator" />
      <li class="item" @click.prevent="openAbout">
        About Ulixee
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { defineComponent } from 'vue';
import Client from '@/api/Client';
import IHeroSessionUpdatedEvent from '@ulixee/desktop-interfaces/events/IHeroSessionUpdatedEvent';

export default defineComponent({
  name: 'Menu',
  components: {},
  props: {
    show: Boolean,
  },
  emits: ['navigated'],
  setup() {
    return {
      scriptEntrypoint: Vue.ref<string>('unknown script'),
      scriptEntrypointRaw: Vue.ref<string>(null),
      scriptEntrypointTs: Vue.ref<string>(null),
      session: Vue.reactive<IHeroSessionUpdatedEvent>({} as any),
    };
  },
  mounted() {
    Client.connect().catch(err => alert(String(err)));
    this.refreshData();
    Client.on('Session.updated', this.onSessionUpdated);
  },
  methods: {
    fileOsTool() {
      const platform = navigator.platform.toLowerCase();
      if (platform.startsWith('win')) return 'Explorer';
      if (platform.startsWith('mac')) return 'Finder';
      return 'File System';
    },
    quitScript() {
      Client.send('Session.close');
    },

    openScript(filepath: string) {
      document.dispatchEvent(
        new CustomEvent('chromealive:api', {
          detail: { command: 'File:navigate', args: { filepath } },
        }),
      );
    },

    continueScript() {
      Client.send('Session.resume', {
        startLocation: 'currentLocation',
      });
    },

    restartScript() {
      Client.send('Session.resume', {
        startLocation: 'sessionStart',
      });
    },

    openAbout() {},

    onSessionUpdated(data: IHeroSessionUpdatedEvent) {
      const divider = data.scriptEntrypoint.includes('/') ? '/' : '\\';
      this.session = data;
      this.scriptEntrypoint = (data.scriptEntrypointTs ?? data.scriptEntrypoint)
        .split(divider)
        .slice(-2)
        .join(divider);
      this.scriptEntrypointRaw = data.scriptEntrypoint;
      this.scriptEntrypointTs = data.scriptEntrypointTs;
    },

    refreshData(): void {
      Client.send('Session.load')
        .then(this.onSessionUpdated)
        .catch(err => alert(String(err)));
    },
  },
});
</script>

<style lang="scss" scoped="scoped">
.Menu {
  margin: 9px 11px 11px 9px;
  border: 1px solid rgba(0, 0, 0, 0.25);
  border-radius: 7px;
  box-shadow: 1px 1px 10px 1px rgba(0, 0, 0, 0.3);
  background: white;
  padding: 0 1px;
  ul {
    text-align: left;
    padding: 5px 1px 3px;
    li {
      &.info {
        padding: 6px 14px 6px 20px;
        font-style: italic;
        opacity: 0.6;
      }
      &.item {
        white-space: nowrap;
        padding: 6px 14px 6px 20px;
        border-radius: 5px;
        &:hover {
          background: #faf4ff;
        }
      }
      &.separator {
        margin: 3px 0;
        height: 1px;
        @apply bg-gray-200;
      }
      &.item-wrapper {
        white-space: nowrap;
        div {
          padding: 6px 14px 6px 20px;
        }
        .item {
          padding: 6px 16px;
          @apply border-l border-gray-200;
          &:hover {
            background: #faf4ff;
          }
        }
      }
    }
  }
}
</style>
