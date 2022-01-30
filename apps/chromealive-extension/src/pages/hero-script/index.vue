<template>
  <div class="grid grid-cols-3 pl-3 h-screen">
    <div class="column h-full pr-3">
      <div class="header">
        <div class="arrow"></div>
        <h1 class="flex-1">Generator Options</h1>
        <div class="text-right">
          <button @click="resetGenerator">Reset</button>
          <button class="arrowed-button border" @click="runGenerator">{{runText}}<div class="arrow"></div></button>
        </div>
      </div>
      <div class="content border-r-2 border-gray-300 h-full pr-5 pt-3">
        <ul class="steps">
          <li class="flex flex-row items-center">
            <label for="location" class="text-sm font-medium text-gray-700 w-14">Match</label>
            <select id="location" v-model="selectorType" name="location" class="flex-1 mt-1 w-full pl-3 pr-10 py-0 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option value="single">Single Element</option>
              <option value="multiple">Multiple Elements</option>
            </select>
          </li>
          <li>
            <label class="text-sm font-medium text-gray-700 w-14">Include {{(selectorType === 'single' || includedNamesById.size === 1) ? 'This Element' : 'These Elements'}}</label>
            <div v-if="!includedNamesById.size" class="italic text-gray-400">
              No included elements
            </div>
            <ul v-else>
              <li @click="openElement(id)" v-for="[id, name] in includedNamesById.entries()" class="border border-dashed rounded border-transparent hover:border-gray-400">{{name}}</li>
            </ul>
          </li>

          <li v-if="selectorType === 'multiple'">
            <label class="text-sm font-medium text-gray-700 w-14">Exclude {{excludedNamesById.size === 1 ? 'This Element' : 'These Elements'}}</label>
            <div v-if="!excludedNamesById.size" class="exclude text-gray-400">
              No excluded elements
            </div>
            <ul v-else>
              <li @click="openElement(id)" v-for="[id, name] in excludedNamesById.entries()" class="border border-dashed rounded border-transparent hover:border-gray-400">{{name}}</li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
    <div class="column h-full pr-3">
      <div class="header">
        <div class="arrow"></div>
        <h1 class="ml-5 flex-1">Selectors Found</h1>
        <div class="text-right">
          <button class="arrowed-button border" @click="runTests">{{testText}}<div class="arrow"></div></button>
        </div>
      </div>
      <div class="content border-r-2 border-gray-300 h-full">
        <table>
          <tbody>
            <tr v-for="selector in selectors">
              <td class="border-t border-gray-300"></td>
              <td class="border-t border-gray-300">
                <span v-for="part in selector" class="border border-dashed rounded border-transparent hover:border-gray-400 font-mono">{{part}}</span>
              </td>
              <td class="border-t border-gray-300"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="column pr-3">
      <div class="header">
        <h1 class="ml-5">Durability</h1>
      </div>
      <div class="content h-full">
        <table>
          <tbody>
            <tr>
              <td><div></div></td>
              <td><div></div></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { MessageEventType } from '@ulixee/apps-chromealive-core/lib/BridgeHelpers';
import { onMessagePayload, sendToContentScript } from '../../lib/devtools/DevtoolsMessenger';

const includedNamesById = Vue.reactive(new Map());
const excludedNamesById = Vue.reactive(new Map());

const runText = Vue.ref('Run');
const testText = Vue.ref('Test');
const selectors = Vue.reactive([]);

onMessagePayload(payload => {
  const { event, name, backendNodeId } = payload;
  if (event === MessageEventType.AddIncludedElement) {
    includedNamesById.set(backendNodeId, name);
  } else if (event === MessageEventType.RemoveIncludedElement) {
    includedNamesById.delete(backendNodeId);
  } else if (event === MessageEventType.AddExcludedElement) {
    excludedNamesById.set(backendNodeId, name);
  } else if (event === MessageEventType.RemoveExcludedElement) {
    excludedNamesById.delete(backendNodeId);
  } else if (event === MessageEventType.FinishedSelectorGeneration) {
    runText.value = 'Run';
    selectors.splice(0, selectors.length, ...payload.selectors);
  }
});

export default Vue.defineComponent({
  name: 'SelectorGenerator',
  components: {},
  setup() {
    const selectorType = Vue.ref<string>('single');
    const selectorTypeAuto = Vue.ref<boolean>(true);

    Vue.watch(selectorType, () => {
      selectorTypeAuto.value = false;
    });

    Vue.watch(includedNamesById, () => {
      if (selectorTypeAuto.value) {
        selectorType.value = includedNamesById.size > 1 ? 'multiple' : 'single';
      }
    });

    return { includedNamesById, excludedNamesById, runText, selectors, testText, selectorType, selectorTypeAuto };
  },
  methods: {
    runGenerator() {
      sendToContentScript(null, { event: MessageEventType.RunSelectorGenerator });
      this.runText = 'Running...';
    },
    runTests() {
      this.testText = 'Testing...';
    },
    resetGenerator() {
      sendToContentScript(null, { event: MessageEventType.ResetSelectorGenerator });
    },
    openElement(backendNodeId: string) {
      sendToContentScript(null, { event: MessageEventType.OpenElementOptionsOverlay, backendNodeId });
    }
  }
});
</script>

<style lang="scss" scoped>
  .header {
    @apply font-bold border-b h-10 flex flex-row items-center relative;
  }
  .header {
    position: relative;
    & > .arrow {
      position: absolute;
      top: 2px;
      right: -1rem;
      border-top: 2px solid rgba(209, 213, 219, 1);
      border-right: 2px solid rgba(209, 213, 219, 1);
      transform: rotate(45deg);
      @apply h-8 w-8;
      /*&:after {*/
      /*  content: '';*/
      /*}*/
    }
  }

  ul.steps {
    & > li {
      padding-left: 10px;
      margin-left: 5px;
      position: relative;
      padding-bottom: 10px;
      &:before {
        content: '';
        background: rgba(0,0,0,0.3);
        position: absolute;
        height: 100%;
        width: 1px;
        left: 0;
        top: 8px;
      }
      &:after {
        content: '';
        position: absolute;
        top: 8px;
        left: -5px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: green;
        border: 1px solid white;
      }
    }
  }

  button {
    @apply px-5;
    &.arrowed-button {
      left: -3px;
      border-right: none;
      background: #D8D8D8;
      border-color: #979797;
      position:relative;
      .arrow {
        width: 30px;
        height: 100%;
        position: absolute;
        right: -30px;
        top: 0;
        overflow: hidden;
        &:after {
          content: "";
          position: absolute;
          top: 2px;
          left: -11px;
          transform: rotate(45deg);
          background: #D8D8D8;
          border: 1px solid #979797;
          width: 19px;
          height: 91%;
        }
      }
    }
  }
</style>
