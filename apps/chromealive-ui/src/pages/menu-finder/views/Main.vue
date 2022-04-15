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
      <div v-if="selectedElement" class="element-view flex flex-col overflow-hidden h-full">
        <div class="header-bar flex-none flex flex-row content-between justify-between p-3">
          <a
            href="javascript:void(0)"
            class="flex-none flex flex-row items-center text-slate-800 opacity-60 hover:opacity-90"
            @click="backToMain"
          >
            <ChevronLeftIcon class="flex-initial w-8" />
            <label class="flex-none italic">Back to finder</label>
          </a>
          <img
            src="@/assets/icons/node_search_icon.svg"
            class="icon h-6 ml-3 mr-2 flex-none mt-1 self-end"
            @click="enableSelectMode"
          >
        </div>
        <div class="content flex flex-col flex-1 overflow-y-auto overflow-x-hidden mt-4 p-3">
          <div
            class="flex flex-none flex-row"
            @mouseenter="highlightNode(selectedElement)"
            @mouseleave="hideHighlight"
          >
            <img src="@/assets/icons/element.svg" class="icon h-6 ml-3 mr-2 flex-none w-10">

            <div class="flex-initial flex-1">
              {{ generateNodePreview(selectedElement) }}
            </div>
          </div>
          <div class="flex flex-col flex-stretch flex-1 mt-5 p-3">
            <h5 class="font-bold text-base">
              Shortest possible query selectors:
            </h5>
            <div
              v-if="isGeneratingQuerySelector"
              class="p-2 mt-2 border-t border-gray-300 rounded-md italic text-sm text-slate-600"
            >
              Calculating shortest querySelector...
            </div>
            <div
              v-for="match of querySelectorMatches"
              class="
                border border-gray-300
                rounded-md
                bg-gray-100
                p-2
                mt-2
                text-sm text-slate-800
                select-all
                break-words
              "
            >
              hero.querySelector("{{ match }}");
            </div>
            <a
              v-if="querySelector.topMatches?.length"
              class="font-bold text-sm mt-4 text-slate-600"
              href="javascript:void(0)"
              @click="moreResults"
            >View more</a>
          </div>
        </div>
      </div>
      <div v-else-if="selectedResource" class="resource-view flex flex-col overflow-hidden h-full">
        <div class="header-bar flex-none flex flex-row content-between justify-between p-3">
          <a
            href="javascript:void(0)"
            class="flex-none flex flex-row items-center text-slate-800 opacity-60 hover:opacity-90"
            @click="backToMain"
          >
            <ChevronLeftIcon class="flex-initial w-8 opacity-50" />
            <label class="flex-none italic text-slate-500">Back to finder</label>
          </a>
        </div>

        <div class="content flex-1 overflow-y-auto overflow-x-hidden mt-5 p-3">
          <div class="flex flex-none flex-row">
            <img src="@/assets/icons/resource.svg" class="icon h-6 mr-2 flex-none w-10">
            <div class="flex-1 mr-3">
              <div>{{ selectedResource.url }}</div>
            </div>
          </div>
          <div class="flex flex-col flex-stretch flex-1 mt-5 p-3">
            <h5 class="font-bold text-base">
              Hero resource filter:
            </h5>
            <pre
              class="
                border border-gray-300
                rounded-md
                bg-gray-100
                p-2
                mt-2
                text-sm text-slate-800
                select-all
                break-words
                whitespace-pre-wrap
              "
            >
  await hero.waitForResource({
    url: "{{ selectedResource.url }}",
    type: "{{ selectedResource.type }}"
  });</pre>
          </div>
          <div class="flex flex-col mt-2 p-3">
            <h5 class="font-bold text-base flex-none">
              Response Body
            </h5>
            <div
              class="
                flex-1
                border border-gray-300
                rounded-md
                bg-gray-100
                p-3
                mt-1
                w-full
                max-w-full
                select-text
                whitespace-pre-wrap
                break-all
              "
              v-html="highlightedBody"
            />
          </div>
        </div>
      </div>
      <div v-else class="search-view flex flex-col overflow-hidden h-full">
        <div class="flex-none form header-bar p-3">
          <div class="flex flex-row">
            <input
              ref="inputElem"
              v-model="inputText"
              type="text"
              placeholder="Search page assets..."
              class="
                appearance-none
                block
                w-full
                px-3
                py-2
                border border-gray-300
                rounded-md
                placeholder-gray-400
                focus:outline-none
              "
              @keyup.enter="runSearch"
              @change="runSearch"
            >
            <img
              src="@/assets/icons/node_search_icon.svg"
              class="icon h-6 ml-3 mr-2 mt-2"
              :class="{ active: isSelectMode }"
              @click="enableSelectMode"
            >
          </div>
          <div class="flex flex-row mt-2" :class="{ 'opacity-80': !searchContext.documentUrl }">
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
          <h5 v-if="searchContext.documentUrl" class="italic text-slate-500 mt-3 p-3">
            Searching {{ searchContext.documentUrl }} from {{ searchTimes() }}
          </h5>
          <ul class="flex flex-col">
            <li
              v-for="record of elementResults"
              v-if="selectedFilter !== 'resources'"
              :key="record.backendNodeId"
              class="flex my-2"
              @click="selectElement(record)"
              @mouseenter="highlightNode(record)"
              @mouseleave="hideHighlight"
            >
              <img src="@/assets/icons/element.svg" class="icon h-6 ml-3 mr-2 flex-none w-10">
              <div class="flex-1">
                {{ generateNodePreview(record) }}
              </div>
            </li>
            <li
              v-for="record of resourceResults"
              v-if="selectedFilter !== 'dom'"
              :key="record.id"
              class="flex my-2"
              @click="selectResource(record)"
            >
              <img src="@/assets/icons/resource.svg" class="icon h-6 ml-3 mr-2 flex-none w-10">
              <div class="flex-1">
                <span class="italic">{{ record.url }}</span>
              </div>
            </li>
          </ul>
        </div>
        <div v-if="devtoolsElement" class="flex-none footer-bar p-3">
          <div
            class="selected-element flex flex-row justify-center"
            @click="selectElement(devtoolsElement)"
            @mouseenter="highlightNode(devtoolsElement)"
            @mouseleave="hideHighlight"
          >
            <label class="flex-none mr-5 text-slate-600">Selected Element</label>
            <img
              src="@/assets/icons/element.svg"
              class="icon h-4 align-middle flex-none mr-2 mt-1"
            >

            <div class="flex-initial w-64 truncate">
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
import { CheckIcon, ChevronLeftIcon, SelectorIcon } from '@heroicons/vue/solid';
import IElementSummary from '@ulixee/apps-chromealive-interfaces/IElementSummary';
import IResourceSearchResult from '@ulixee/apps-chromealive-interfaces/IResourceSearchResult';
import { ISearchContext } from '@ulixee/apps-chromealive-interfaces/ISessionSearchResult';
import { ISelectorMap } from '@ulixee/apps-chromealive-interfaces/ISelectorMap';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';

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
    SelectorIcon,
  },
  setup() {
    const querySelector = Vue.reactive<ISelectorMap>({
      ancestors: [],
      topMatches: [],
      target: {} as any,
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
            valueText = `${value.substring(0, 49)}\u2026`;
          }
          attrText += `="${valueText}"`;
        }
      }

      const tag = element.localName;

      let textContent = element.nodeValueInternal ?? '';
      if (textContent.length > 50) textContent = textContent.substring(0, 20) + '\u2026';
      if (element.hasChildren && textContent === '') textContent = '\u2026';
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

    onSessionUpdated(message: IHeroSessionActiveEvent): void {
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

    Client.on('Session.active', message => this.onSessionUpdated(message));

    Client.on('DevtoolsBackdoor.toggleInspectElementMode', ({ isActive }) => {
      console.log('DevtoolsBackdoor.toggleInspectElementMode', isActive);
      this.handleInspectElementModeChange(isActive);
    });
    Client.on('DevtoolsBackdoor.elementWasSelected', event => {
      console.log('DevtoolsBackdoor.elementWasSelected', event);
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
  let cleanedBody = santizer.innerHTML;
  return cleanedBody
    .replaceAll('&amp;MARK-&amp;', '<mark>')
    .replaceAll('&amp;-MARK&amp;', '</mark>');
}
</script>

<style lang="scss" scoped="scoped">
@use "sass:math";

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
