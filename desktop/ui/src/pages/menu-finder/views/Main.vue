<template>
  <div class="Finder absolute">
    <div
      v-if="isSelectMode"
      ref="selectionRef"
      class="waiting-for-selection"
    >
      WAITING FOR ELEMENT
    </div>
    <div
      v-else
      ref="overlayBoxRef"
      class="overlay-box"
    >
      <div v-if="selectedElement" class="element-view flex h-full flex-col overflow-hidden">
        <div class="header-bar flex flex-none flex-row content-between justify-between p-3">
          <a
            href="javascript:void(0)"
            class="flex flex-none flex-row items-center text-slate-800 opacity-60 hover:opacity-90"
            @click="backToMain"
          >
            <ChevronLeftIcon class="w-8 flex-initial" />
            <label class="flex-none italic">Back to finder</label>
          </a>
          <img
            src="@/assets/icons/node_search_icon.svg"
            class="icon ml-3 mr-2 mt-1 h-6 flex-none self-end"
            @click="enableSelectMode"
          >
        </div>
        <div class="content mt-4 flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-3">
          <div
            class="flex flex-none flex-row"
            @mouseenter="highlightNode(selectedElement)"
            @mouseleave="hideHighlight"
          >
            <img src="@/assets/icons/element.svg" class="icon ml-3 mr-2 h-6 w-10 flex-none">

            <div class="flex-initial flex-1">
              {{ generateNodePreview(selectedElement) }}
            </div>
          </div>
          <div class="flex-stretch mt-5 flex flex-1 flex-col p-3">
            <h5 class="text-base font-bold">
              Shortest possible query selectors:
            </h5>
            <div
              v-if="isGeneratingQuerySelector"
              class="mt-2 rounded-md border-t border-gray-300 p-2 text-sm italic text-slate-600"
            >
              Calculating shortest querySelector...
            </div>
            <div
              v-for="match of querySelectorMatches"
              class="mt-2 select-all break-words rounded-md border border-gray-300 bg-gray-100 p-2 text-sm text-slate-800"
            >
              hero.querySelector("{{ match }}");
            </div>
            <a
              v-if="querySelector.topMatches?.length"
              class="mt-4 text-sm font-bold text-slate-600"
              href="javascript:void(0)"
              @click="moreResults"
            >View more</a>
          </div>
        </div>
      </div>
      <div v-else-if="selectedResource" class="resource-view flex h-full flex-col overflow-hidden">
        <div class="header-bar flex flex-none flex-row content-between justify-between p-3">
          <a
            href="javascript:void(0)"
            class="flex flex-none flex-row items-center text-slate-800 opacity-60 hover:opacity-90"
            @click="backToMain"
          >
            <ChevronLeftIcon class="w-8 flex-initial opacity-50" />
            <label class="flex-none italic text-slate-500">Back to finder</label>
          </a>
        </div>

        <div class="content mt-5 flex-1 overflow-y-auto overflow-x-hidden p-3">
          <div class="flex flex-none flex-row">
            <img src="@/assets/icons/resource.svg" class="icon mr-2 h-6 w-10 flex-none">
            <div class="mr-3 flex-1">
              <div>{{ selectedResource.url }}</div>
            </div>
          </div>
          <div class="flex-stretch mt-5 flex flex-1 flex-col p-3">
            <h5 class="text-base font-bold">
              Hero resource filter:
            </h5>
            <pre
              class="mt-2 select-all whitespace-pre-wrap break-words rounded-md border border-gray-300 bg-gray-100 p-2 text-sm text-slate-800"
            >
  await hero.waitForResource({
    url: "{{ selectedResource.url }}",
    type: "{{ selectedResource.type }}"
  });</pre>
          </div>
          <div class="mt-2 flex flex-col p-3">
            <h5 class="flex-none text-base font-bold">
              Response Body
            </h5>
            <div
              class="mt-1 w-full max-w-full flex-1 select-text whitespace-pre-wrap break-all rounded-md border border-gray-300 bg-gray-100 p-3"
              v-html="highlightedBody"
            />
          </div>
        </div>
      </div>
      <div v-else class="search-view flex h-full flex-col overflow-hidden">
        <div class="form header-bar flex-none p-3">
          <div class="flex flex-row">
            <a
              href="javascript:void(0)"
              class="icon ml-2 mt-2 mr-3 mt-1 inline-block h-6 justify-center align-middle"
              @click="hideMenu"
            >X</a>
            <input
              ref="inputElem"
              v-model="inputText"
              type="text"
              placeholder="Search page assets..."
              class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:outline-none"
              @keyup.enter="runSearch"
              @change="runSearch"
            >
            <img
              src="@/assets/icons/node_search_icon.svg"
              class="icon ml-3 mr-2 mt-2 h-6"
              :class="{ active: isSelectMode }"
              @click="enableSelectMode"
            >
          </div>
          <div class="mt-2 flex flex-row" :class="{ 'opacity-80': !searchContext.documentUrl }">
            <label class="font-sm text-slate-500">Filter results by:</label>
            <a
              href="javascript:void(0)"
              class="mx-5 text-slate-700"
              :class="{ 'font-bold': selectedFilter === 'dom' }"
              @click="filterBy('dom')"
            >DOM Nodes</a>
            <span class="divider mh-2">/</span>
            <a
              href="javascript:void(0)"
              class="mx-5 text-slate-700"
              :class="{ 'font-bold': selectedFilter === 'resources' }"
              @click="filterBy('resources')"
            >Resources</a>
          </div>
        </div>
        <div class="content flex-1 overflow-y-auto overflow-x-hidden">
          <h5 v-if="searchContext.documentUrl" class="mt-3 p-3 italic text-slate-500">
            Searching {{ searchContext.documentUrl }} from {{ searchTimes() }}
          </h5>
          <ul class="flex flex-col">
            <li
              v-for="record of elementResults"
              v-if="selectedFilter !== 'resources'"
              :key="record.backendNodeId"
              class="my-2 flex"
              @click="selectElement(record)"
              @mouseenter="highlightNode(record)"
              @mouseleave="hideHighlight"
            >
              <img src="@/assets/icons/element.svg" class="icon ml-3 mr-2 h-6 w-10 flex-none">
              <div class="flex-1">
                {{ generateNodePreview(record) }}
              </div>
            </li>
            <li
              v-for="record of resourceResults"
              v-if="selectedFilter !== 'dom'"
              :key="record.id"
              class="my-2 flex"
              @click="selectResource(record)"
            >
              <img src="@/assets/icons/resource.svg" class="icon ml-3 mr-2 h-6 w-10 flex-none">
              <div class="flex-1">
                <span class="italic">{{ record.url }}</span>
              </div>
            </li>
          </ul>
        </div>
        <div v-if="devtoolsElement" class="footer-bar flex-none p-3">
          <div
            class="selected-element flex flex-row justify-center"
            @click="selectElement(devtoolsElement)"
            @mouseenter="highlightNode(devtoolsElement)"
            @mouseleave="hideHighlight"
          >
            <label class="mr-5 flex-none text-slate-600">Selected Element</label>
            <img
              src="@/assets/icons/element.svg"
              class="icon mr-2 mt-1 h-4 flex-none align-middle"
            >

            <div class="w-64 flex-initial truncate">
              {{ generateNodePreview(devtoolsElement) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '@/api/Client';
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue';
import { CheckIcon, ChevronLeftIcon } from '@heroicons/vue/24/solid';
import IElementSummary from '@ulixee/desktop-interfaces/IElementSummary';
import IResourceSearchResult from '@ulixee/desktop-interfaces/IResourceSearchResult';
import { ISearchContext } from '@ulixee/desktop-interfaces/ISessionSearchResult';
import { ISelectorMap } from '@ulixee/desktop-interfaces/ISelectorMap';
import IHeroSessionUpdatedEvent from '@ulixee/desktop-interfaces/events/IHeroSessionUpdatedEvent';

function roundFloor(num: number): number {
  return Math.round(10 * num) / 10;
}
export default Vue.defineComponent({
  name: 'Finder',
  components: {
    Listbox,
    ListboxButton,
    ListboxLabel,
    ListboxOption,
    ListboxOptions,
    ChevronLeftIcon,
    CheckIcon,
  },
  setup() {
    const querySelector = Vue.reactive<ISelectorMap>({
      ancestors: [],
      topMatches: [],
      target: {} as any,
      nodePath: '',
    });
    const matchesShown = Vue.ref(1);
    const querySelectorMatches = Vue.computed(() => {
      return querySelector.topMatches.slice(0, matchesShown.value);
    });

    return {
      matchesShown,
      querySelector,
      querySelectorMatches,
      highlightedBody: Vue.ref<string>(''),
      heroSessionId: Vue.ref<string>(''),
      overlayBoxRef: Vue.ref<HTMLElement>(),
      selectionRef: Vue.ref<HTMLElement>(),
      inputElem: Vue.ref<HTMLInputElement>(),
      inputText: Vue.ref(''),
      searchContext: Vue.reactive<ISearchContext>({} as any),
      selectedFilter: Vue.ref<'dom' | 'resources'>(null),
      isSelectMode: Vue.ref(false),
      isGeneratingQuerySelector: Vue.ref(false),
      devtoolsElement: Vue.ref<IElementSummary>(),
      selectedElement: Vue.ref<IElementSummary>(),
      selectedResource: Vue.ref<IResourceSearchResult>(),
      elementResults: Vue.reactive<IElementSummary[]>([]),
      resourceResults: Vue.reactive<IResourceSearchResult[]>([]),
      clearInspectorTimeout: null as number,
      resizeObserver: null as ResizeObserver,
      restoreHeight: 400 as number,
    };
  },
  watch: {
    isSelectMode(value) {
      if (value) {
        this.restoreHeight = this.overlayBoxRef.getBoundingClientRect().height;
      }
      void this.$nextTick(() => this.sendResizeEvent());
    },
  },
  methods: {
    hideMenu() {
      window.close();
    },
    searchTimes() {
      const { startTime, endTime, baseTime } = this.searchContext;
      const start = roundFloor((startTime - baseTime) / 1000);
      const end = roundFloor((endTime - baseTime) / 1000);
      return `${start}s to ${end}s`;
    },
    enableSelectMode() {
      this.isSelectMode = true;
      void Client.send('DevtoolsBackdoor.toggleInspectElementMode');
    },
    generateNodePreview(element: IElementSummary): string {
      let attrText = '';
      for (const attr of element.attributes) {
        const { name, value } = attr;
        if (name === 'style') continue;
        attrText += ` ${name}`;
        if (value) {
          let valueText = value;
          if (valueText.length > 50) {
            valueText = `${value.substring(0, 49)}...`;
          }
          attrText += `="${valueText}"`;
        }
      }

      const tag = element.localName;

      let textContent = element.nodeValueInternal ?? '';
      if (textContent.length > 50) textContent = `${textContent.substring(0, 20)}...`;
      if (element.hasChildren && textContent === '') textContent = '...';
      return `<${tag}${attrText}>${textContent}</${tag}>`;
    },
    moreResults() {
      this.matchesShown += 5;
    },
    handleInspectElementModeChange(isActive: boolean) {
      clearTimeout(this.clearInspectorTimeout);
      if (!isActive) {
        // give it a second to turn off
        this.clearInspectorTimeout = setTimeout(() => (this.isSelectMode = isActive), 500) as any;
      }
    },

    handleElementWasSelected(element: IElementSummary) {
      if (this.isSelectMode) {
        this.isSelectMode = false;
        void this.selectElement(element);
      } else {
        this.devtoolsElement = element;
      }
    },

    highlightNode(element: IElementSummary) {
      void Client.send('DevtoolsBackdoor.highlightNode', {
        backendNodeId: element.backendNodeId,
        objectId: element.objectId,
      });
    },

    hideHighlight() {
      void Client.send('DevtoolsBackdoor.hideHighlight');
    },

    async selectElement(elementSummary: IElementSummary) {
      this.selectedElement = elementSummary;
      this.matchesShown = 1;
      this.querySelector.topMatches.length = 0;
      this.querySelector.ancestors.length = 0;
      this.isGeneratingQuerySelector = true;
      const { backendNodeId } = elementSummary;
      const response = await Client.send('DevtoolsBackdoor.generateQuerySelector', {
        backendNodeId,
      });
      console.log('Created query selector map', response);
      Object.assign(this.querySelector, response);
      this.isGeneratingQuerySelector = false;
    },

    selectResource(resource: IResourceSearchResult): void {
      this.selectedResource = resource;
      this.highlightedBody = highlightIndices(resource.body, resource.matchIndices);
    },

    backToMain() {
      this.selectedElement = null;
      this.selectedResource = null;
      this.highlightedBody = null;
    },

    async runSearch() {
      const query = this.inputText;
      const searchResult = await Client.send('Session.search', { query });
      console.log('Session.search', searchResult);
      Object.assign(this.searchContext, searchResult.searchingContext);
      this.resourceResults.length = 0;
      this.elementResults.length = 0;
      Object.assign(this.resourceResults, searchResult.resources);
      Object.assign(this.elementResults, searchResult.elements);
    },

    filterBy(type: 'dom' | 'resources') {
      if (this.selectedFilter === type) this.selectedFilter = null;
      else this.selectedFilter = type;
    },

    sendResizeEvent() {
      let height = this.restoreHeight;
      if (this.isSelectMode) {
        height = this.selectionRef.getBoundingClientRect().height;
      }
      document.dispatchEvent(
        new CustomEvent('App:changeHeight', {
          detail: {
            height,
          },
        }),
      );
    },

    onSessionUpdated(message: IHeroSessionUpdatedEvent): void {
      if (!message || this.heroSessionId !== message.heroSessionId) {
        this.resourceResults.length = 0;
        this.elementResults.length = 0;
        this.backToMain();
      }
      this.heroSessionId = message?.heroSessionId;
    },
  },
  mounted() {
    window.addEventListener('focus', () => {
      void this.$nextTick(() => {
        if (this.isSelectMode) return;
        this.inputElem?.focus();
      });
    });

    Client.on('Session.updated', message => this.onSessionUpdated(message));

    Client.on('DevtoolsBackdoor.toggleInspectElementMode', ({ isActive }) => {
      this.handleInspectElementModeChange(isActive);
    });

    Client.on('DevtoolsBackdoor.elementWasSelected', event => {
      this.handleElementWasSelected(event.element);
    });
  },
  unmounted() {
    this.resizeObserver.disconnect();
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

<style lang="scss" scoped="scoped">
@use 'sass:math';

.Finder {
  z-index: 20;
  height: 100%;
  width: 100%;
}

.overlay-box {
  margin: 9px 11px 11px 9px;
  border: 1px solid rgba(0, 0, 0, 0.25);
  border-radius: 7px;
  background: white;
  box-shadow: 1px 1px 10px 1px rgba(0, 0, 0, 0.3);
  width: calc(100% - 20px);
  height: calc(100% - 20px);
  -webkit-app-region: no-drag;
}
.content {
  -webkit-app-region: no-drag;
}

.waiting-for-selection {
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.25);
  background: white;
  padding: 6px 10px;
  text-align: center;
  border-radius: 4px;
  color: rgba(0, 0, 0, 0.7);
  box-shadow: 1px 1px 5px 1px rgba(0, 0, 0, 0.2);
}

.icon {
  opacity: 0.5;
  &:hover {
    opacity: 1;
  }
}

.header-bar {
  @apply bg-gray-100;
  border-radius: 7px 7px 0 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  -webkit-app-region: drag;
}
.footer-bar {
  @apply bg-gray-100;
  border-radius: 0 0 7px 7px;
  box-shadow: 0 -1px 2px rgba(0, 0, 0, 0.2);
  -webkit-app-region: drag;
}

.results {
  min-height: 200px;
}
</style>
