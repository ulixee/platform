<template>
  <div class="Finder absolute">
    <div v-if="isSelectMode" ref="selectionRef" class="waiting-for-selection">
      WAITING FOR ELEMENT
    </div>
    <div v-else ref="overlayBoxRef" class="overlay-box">
      <div class="element-view flex h-full flex-col overflow-hidden">
        <div class="header-bar flex flex-none flex-row content-between justify-between p-3">
          <a
            href="javascript:void(0)"
            class="icon ml-2 mt-2 mr-3 mt-1 inline-block h-6 justify-center align-middle no-drag"
            @click="hideMenu"
            >X</a
          >
          <NodeSearchIcon
            class="icon ml-3 mr-2 mt-1 h-6 flex-none self-end no-drag cursor-pointer"
            @click="enableSelectMode"
          />
        </div>
        <div class="content mt-4 flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-3">
          <div
            v-if="selectedElement"
            class="flex flex-none flex-row"
            @mouseenter="highlightNode(selectedElement)"
            @mouseleave="hideHighlight"
          >
            <ElementIcon class="icon ml-3 mr-2 h-6 w-10 flex-none" />

            <div class="flex-initial flex-1">
              {{ generateNodePreview(selectedElement) }}
            </div>
          </div>
          <div v-if="selectedElement" class="flex-stretch mt-5 flex flex-1 flex-col p-3">
            <h5 class="text-base font-bold">Shortest possible query selectors:</h5>
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
              >View more</a
            >
          </div>
        </div>
        <div v-if="devtoolsElement" class="footer-bar flex-none p-3">
          <div
            class="selected-element flex flex-row justify-center"
            @click="selectElement(devtoolsElement)"
            @mouseenter="highlightNode(devtoolsElement)"
            @mouseleave="hideHighlight"
          >
            <label class="mr-5 flex-none text-slate-600">Selected Element</label>
            <ElementIcon
              class="icon mr-2 mt-1 h-4 flex-none align-middle"
            />

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
import Client from '@/api/Client';
import NodeSearchIcon from '@/assets/icons/node_search_icon.svg';
import ElementIcon from '@/assets/icons/element.svg';
import { CheckIcon, ChevronLeftIcon } from '@heroicons/vue/24/solid';
import IElementSummary from '@ulixee/desktop-interfaces/IElementSummary';
import { ISelectorMap } from '@ulixee/desktop-interfaces/ISelectorMap';
import * as Vue from 'vue';

function roundFloor(num: number): number {
  return Math.round(10 * num) / 10;
}
export default Vue.defineComponent({
  name: 'Finder',
  components: {
    ChevronLeftIcon,
    CheckIcon,
    ElementIcon,
    NodeSearchIcon,
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
      heroSessionId: Vue.ref<string>(''),
      overlayBoxRef: Vue.ref<HTMLElement>(),
      selectionRef: Vue.ref<HTMLElement>(),
      isSelectMode: Vue.ref(false),
      isGeneratingQuerySelector: Vue.ref(false),
      devtoolsElement: Vue.ref<IElementSummary>(),
      selectedElement: Vue.ref<IElementSummary>(),
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
      if (this.isSelectMode || !this.selectedElement) {
        this.isSelectMode = false;
        void this.selectElement(element);
      } else if (element.backendNodeId === this.selectedElement?.backendNodeId) {
        this.devtoolsElement = null;
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
      if (this.devtoolsElement?.backendNodeId === elementSummary.backendNodeId) {
        this.devtoolsElement = null;
      }
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
  },
  mounted() {
    Client.on('Session.appMode', ev => {
      if (ev.mode === 'Finder' && ev.trigger === 'contextMenu') {
        this.selectedElement = this.devtoolsElement;
      }
    });

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
.content,
.no-drag {
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
