<template>
  <div class="grid grid-cols-3 pl-3 h-screen">
    <div class="column h-full pr-3">
      <div class="header font-bold border-b h-10">
        <h1>Generator Options</h1>
        <button @click="resetGenerator">Reset</button>
        <button class="border" @click="runGenerator">{{runText}}</button>
      </div>
      <div class="content border-r-2 h-full">
        <ul>
          <li>Match</li>
          <li>Within container elements</li>
          <li>
            that must include...
            <ul>
              <li v-for="name in includedNamesByKey.values()">{{name}}</li>
            </ul>
          </li>

          <li>
            and must NOT include...
            <ul>
              <li v-for="name in excludedNamesByKey.values()">{{name}}</li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
    <div class="column h-full pr-3">
      <div class="header font-bold border-b h-10">
        <h1>Selectors Found</h1>
      </div>
      <div class="content border-r-2 h-full">
        <table>
          <tbody>
            <tr v-for="selector in selectors">
              <td>QS</td>
              <td>{{selector}}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="column h-full pr-3">
      <div class="header font-bold border-b h-10">
        <h1>Durability</h1>
      </div>
      <div class="content h-full">
        <table>
          <tbody>
            <tr>
              <td><div></div></td>
              <td><div></div></td>
              <td>98%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { onMessagePayload, sendToContentScript } from '../../lib/devtools/DevtoolsMessenger';

const includedNamesByKey = Vue.reactive(new Map());
const excludedNamesByKey = Vue.reactive(new Map());

const runText = Vue.ref('Run');
const selectors = Vue.reactive([]);

onMessagePayload(payload => {
  const { event, name, key } = payload;
  if (event === 'AddIncludedElement') {
    includedNamesByKey.set(key, name);
  } else if (event === 'RemoveIncludedElement') {
    includedNamesByKey.delete(key);
  } else if (event === 'AddExcludedElement') {
    excludedNamesByKey.set(key, name);
  } else if (event === 'RemoveExcludedElement') {
    excludedNamesByKey.delete(key);
  } else if (event === 'FinishedSelectorGeneration') {
    runText.value = 'Run';
    console.log('SELECTORS: ', selectors);
    selectors.splice(0, selectors.length, ...payload.selectors);
  }
});

export default Vue.defineComponent({
  name: 'SelectorGenerator',
  components: {},
  setup() {
    return { includedNamesByKey, excludedNamesByKey, runText, selectors };
  },
  methods: {
    runGenerator() {
      sendToContentScript(null, { event: 'RunSelectorGenerator' });
      this.runText = 'Running...';
    },
    resetGenerator() {
      sendToContentScript(null, { event: 'ResetSelectorGenerator' });
    }
  }
});

</script>
