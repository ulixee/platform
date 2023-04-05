<template>
  <div class="flex h-screen flex-row divide-x divide-chrome">
    <div class="basis-3/6 overflow-auto">
      <div
        class="controls header-bar border-r-1 sticky top-0 w-full box-border flex h-8 flex-row border-slate-400 bg-chrome p-1"
      >
        <input
          ref="inputElem"
          v-model="searchText"
          type="text"
          placeholder="Search resources..."
          class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none"
          @keyup.enter="runSearch"
        >
        <MagnifyingGlassIcon
          class="icon m-1 box-border h-4 text-slate-700 hover:text-slate-800"
          @click="runSearch"
        />
      </div>
      <table class="w-full table-fixed">
        <thead class="h-4">
          <tr class="header-lip sticky top-8 bg-chrome text-left font-thin">
            <th class="w-1/2 pl-2 font-normal">
              Name
            </th>
            <th class="font-normal">
              Status
            </th>
            <th class="font-normal">
              Type
            </th>
            <th class="font-normal">
              Size (up/down)
            </th>
            <!--            <th class="font-normal">-->
            <!--              Patched by Mitm-->
            <!--            </th>-->
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="resource of visibleResources"
            :key="resource.id"
            :ref="
              el => {
                resourcesElemsById[resource.id] = el;
              }
            "
            class="border-l-2 px-2 hover:bg-purple-200"
            :class="[
              resource === selectedResource ? 'bg-purple-500 text-white hover:bg-purple-500' : '',
              resource.receivedAtCommandId <= focusedCommandId
                ? 'border-purple-800'
                : 'border-transparent text-slate-400',
            ]"
            @click="clickedResource(resource)"
          >
            <td class="overflow-hidden text-ellipsis whitespace-nowrap pl-2">
              {{ resource.url }}
            </td>
            <td>{{ resource.statusCode }}</td>
            <td>{{ resource.type }}</td>
            <td>
              <span v-if="resource.postDataBytes">{{ Math.round((10 * (resource.postDataBytes ?? 0)) / 1000) / 10 }}KB</span><span v-else>0</span> /
              {{ Math.round((10 * resource.responseBodyBytes) / 1000) / 10 }}KB
            </td>
            <!--            <td class="pr-2">-->
            <!--              {{ resource.didMitmModifyHeaders }}-->
            <!--            </td>-->
          </tr>
        </tbody>
      </table>
    </div>
    <div ref="resourceDetailsRef" class="text-md h-screen basis-3/6 resize-x overflow-auto p-3">
      <div v-if="selectedResource">
        <h5 class="font-regular text-base">
          <span class="mr-1 text-sm font-semibold">{{ selectedResource.method }}</span>
          <span class="text-thin text-sm">{{ selectedResource.url }}</span>
        </h5>
        <h5 class="text-md mt-2 font-semibold">
          Request Headers
        </h5>
        <ul class="p-2">
          <li
            v-for="[name, value] in Object.entries(selectedResource.requestHeaders ?? {})"
            :key="name"
            class="text-xs"
          >
            <span class="mr-2 font-semibold text-slate-600">{{ name }}</span>
            <ul v-if="Array.isArray(value)" class="ml-2 list-inside list-disc">
              <li v-for="entry in value">
                {{ entry }}
              </li>
            </ul>
            <span v-else>{{ value }}</span>
          </li>
        </ul>
        <h5 class="mt-2 text-sm font-semibold">
          Response Headers
        </h5>
        <ul class="p-2">
          <li
            v-for="[name, value] in Object.entries(selectedResource.responseHeaders ?? {})"
            :key="name"
            class="text-xs"
          >
            <span class="mr-2 font-semibold text-slate-600">{{ name }}</span>
            <ul v-if="Array.isArray(value)" class="ml-2 list-inside list-disc">
              <li v-for="entry in value">
                {{ entry }}
              </li>
            </ul>
            <span v-else>{{ value }}</span>
          </li>
        </ul>
        <h5 class="mt-2 text-sm font-semibold">
          Response Body
        </h5>
        <div
          v-if="selectedResourceDetails"
          class="m-2 select-all overflow-auto rounded border border-slate-300 p-2 text-xs"
        >
          <img
            v-if="
              selectedResource.type === 'Image' &&
                selectedResourceDetails.responseBody.startsWith('data:')
            "
            :src="selectedResourceDetails.responseBody"
          >
          <div
            v-else-if="highlightedBody"
            class="whitespace-pre-wrap break-all"
            v-html="highlightedBody"
          />
          <div v-else class="whitespace-pre-wrap break-all">
            {{ selectedResourceDetails.responseBody }}
          </div>
        </div>
        <h5
          v-if="selectedResourceDetails && selectedResourceDetails.postBody"
          class="mt-2 text-base font-semibold"
        >
          Post Body
        </h5>
        <div
          v-if="selectedResourceDetails && selectedResourceDetails.postBody"
          class="m-2 select-all whitespace-pre-wrap rounded border border-slate-300 p-2 text-xs"
        >
          {{ selectedResourceDetails.postBody }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import ICommandUpdatedEvent from '@ulixee/desktop-interfaces/events/ICommandUpdatedEvent';
import ICommandFocusedEvent from '@ulixee/desktop-interfaces/events/ICommandFocusedEvent';
import {
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PauseIcon,
  PlayIcon,
} from '@heroicons/vue/24/outline';
import IResourceOverview from '@ulixee/desktop-interfaces/IResourceOverview';
import IResourceSearchResult from '@ulixee/desktop-interfaces/IResourceSearchResult';
import Client from '../../../api/Client';

export default Vue.defineComponent({
  name: 'HeroScriptPanel',
  components: { ExclamationTriangleIcon, PlayIcon, PauseIcon, MagnifyingGlassIcon },
  setup() {
    const resources = Vue.ref<IResourceOverview[]>([]);
    const searchResultsById = Vue.ref(new Map<number, IResourceSearchResult>());
    const visibleResources = Vue.computed(() => {
      if (searchResultsById.value.size) {
        return resources.value.filter(x => searchResultsById.value.has(x.id));
      }
      return resources.value;
    });
    return {
      resources,
      searchResultsById,
      visibleResources,
      searchText: Vue.ref(''),
      selectedResource: Vue.ref<IResourceOverview>(),
      highlightedBody: Vue.ref<string>(''),
      selectedResourceDetails: Vue.ref<{ postBody?: string; responseBody?: string }>({}),
      focusedCommandId: Vue.ref<number>(null),
      hasTrueFocus: Vue.ref<boolean>(false),
      scrollOnTimeout: -1,
      resourceDetailsRef: Vue.ref<HTMLDivElement>(null),
      resourcesElemsById: Vue.ref<{ [id: string]: HTMLTableRowElement }>({}),
    };
  },
  methods: {
    async runSearch() {
      const query = this.searchText;
      if (!query) {
        this.searchResultsById.clear();
        return;
      }
      const searchResult = await Client.send('Session.searchResources', { query });
      console.log('Session.searchResources', searchResult);

      this.searchResultsById.clear();
      for (const result of searchResult.resources) {
        this.searchResultsById.set(result.id, result);
      }
    },
    clickedResource(resource: IResourceOverview): void {
      this.selectedResource = resource;
      this.hasTrueFocus = true;
      this.selectedResourceDetails = {};
      this.resourceDetailsRef?.scrollTo(0, 0);
      void Client.send('Session.getResourceDetails', resource.id).then(x => {
        this.selectedResourceDetails = x;
        return null;
      });

      const searchResult = this.searchResultsById.get(resource.id);
      this.highlightedBody = searchResult
        ? highlightIndices(searchResult.body, searchResult.matchIndices)
        : '';
    },
    moveUpResources(): void {
      const idx = this.resources.indexOf(this.selectedResource);
      const prev = this.resources[idx - 1];
      if (prev) {
        this.clickedResource(prev);
        this.scrollToResourceId(prev.id);
      }
    },
    moveDownResources(): void {
      const idx = this.resources.indexOf(this.selectedResource);
      const next = this.resources[idx + 1];
      if (next) {
        this.clickedResource(next);
        this.scrollToResourceId(next.id);
      }
    },
    onSessionResource(event: { resource: IResourceOverview }): void {
      this.resources.push(event.resource);
      this.resources.sort((a, b) => {
        const commandDiff = a.receivedAtCommandId - b.receivedAtCommandId;
        if (commandDiff === 0) return a.id - b.id;
        return commandDiff;
      });
    },
    onCommandUpdated(message: ICommandUpdatedEvent) {
      if (!this.hasTrueFocus) {
        let scrollToResource: IResourceOverview;
        if (message.isComplete) {
          for (const resource of this.resources) {
            if (resource.receivedAtCommandId === message.command.id) {
              scrollToResource = resource;
            }
          }
        }
        this.focusedCommandId = message.command.id;
        if (scrollToResource) this.scrollToResourceId(scrollToResource.id);
      }
    },
    scrollToResourceId(id: number): void {
      clearTimeout(this.scrollOnTimeout);
      this.scrollOnTimeout = setTimeout(() => {
        const $el = this.resourcesElemsById[id];
        if ($el) $el.scrollIntoView({ block: 'center' });
      }) as any;
    },
    onCommandFocused(message: ICommandFocusedEvent) {
      this.focusedCommandId = message.commandId;
      this.hasTrueFocus = true;
      let scrollToResource: IResourceOverview;
      for (const resource of this.resources) {
        if (resource.receivedAtCommandId === message.commandId) {
          scrollToResource = resource;
        }
      }
      if (scrollToResource) this.scrollToResourceId(scrollToResource.id);
    },
    onResourcesResponse(message: IResourceOverview[]) {
      Object.assign(this.resources, message);
    },
  },

  mounted() {
    document.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowUp') {
        this.moveUpResources();
        ev.preventDefault();
        return false;
      }
      if (ev.key === 'ArrowDown') {
        this.moveDownResources();
        ev.preventDefault();
        return false;
      }
    });
    Client.send('Session.getResources')
      .then(this.onResourcesResponse)
      .catch(() => null);
    Client.on('Session.resource', this.onSessionResource);
    Client.on('Command.updated', this.onCommandUpdated);
    Client.on('Command.focused', this.onCommandFocused);
  },

  beforeUnmount() {
    Client.off('Session.resource', this.onSessionResource);
    Client.off('Command.updated', this.onCommandUpdated);
    Client.off('Command.focused', this.onCommandFocused);
  },
});
function highlightIndices(body: string, indices: [start: number, end: number][]) {
  const startMarker = '&MARK-&';
  const endMarker = '&-MARK&';
  const newBody = [];

  let lastMarker = 0;
  for (const [start, end] of indices) {
    newBody.push(body.slice(lastMarker, start), startMarker);
    newBody.push(body.slice(start, end + 1), endMarker);
    lastMarker = end + 1;
  }
  newBody.push(body.slice(lastMarker));

  const santizer = document.createElement('p');
  santizer.textContent = newBody.join('');
  const cleanedBody = santizer.innerHTML;
  return cleanedBody
    .replaceAll('&amp;MARK-&amp;', '<mark>')
    .replaceAll('&amp;-MARK&amp;', '</mark>');
}
</script>

<style lang="scss">
body,
#app {
  height: 100vh;
  margin: 0;
  border-top: 0 none;
  width: 100%;
}
.header-bar {
  border-bottom: 0 none;
}
.header-lip {
  box-shadow: 0 0 1px rgba(0, 0, 0, 0.12), 0 1px 1px rgba(0, 0, 0, 0.16), 1px 0 0 0 rgb(0 0 0 / 16%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.2);
}
</style>
