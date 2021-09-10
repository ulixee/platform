<template>
  <div class="Json">
    <div
      class="JsonNode"
      v-for="node of json"
      :key="node.id"
      :ref="node.id"
      :id="node.path"
      :class="{ highlighted: node.highlighted }"
    >
      <div class="indent" v-for="i in node.level" :key="i">{{ ' ' }}</div>
      <span v-if="node.key" class="key">{{ node.key }}: </span>
      <span>
        <span :class="{ ['value-' + node.type]: node.isContent, brackets: !node.isContent }">{{
          node.content
        }}</span>
        <span v-if="node.showComma" class="comma">, </span>
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropOptions } from 'vue';
import Component from 'vue-class-component';
import flattenJson, { FlatJson } from '@/utils/flattenJson';

// Define the props by using Vue's canonical way.
const JsonProps = Vue.extend({
  props: {
    json: <PropOptions<FlatJson[]>>{
      type: Array,
      required: false,
    },
  },
});

@Component
export default class Json extends JsonProps {

  public scrollToId(id: number) {
    const refs = this.$refs[id] as HTMLElement[];
    if (!refs) return;
    if (refs.length) {
      refs[refs.length - 1].scrollIntoView({ block: 'center' });
    }
  }

  public static toFlat(json: any, highlightedPaths: string[] = []): FlatJson[] {
    const flatJson = flattenJson(json);

    let counter = 0;
    for (const record of flatJson) {
      record.id = counter += 1;
      if (highlightedPaths?.some(x => record.path.startsWith(x))) {
        record.highlighted = true;
      }
    }
    return flatJson;
  }
}
</script>

<style lang="scss">
@import '../assets/style/resets';
@import '../assets/style/flatjson';
</style>
