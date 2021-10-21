<template>
  <div class="Json">
    <div
      class="JsonNode"
      v-for="node of json"
      :key="node.id"
      :ref="el => { jsonNodes[node.id] = el }"
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
import { ref, defineComponent, onBeforeUpdate } from 'vue';

export default defineComponent({
  name: 'Json',
  components: {},
  props: {
    json: {
      type: Array,
      required: false,
    },
  },
  setup() {
    const jsonNodes = ref([]);

    onBeforeUpdate(() => {
      jsonNodes.value = [];
    });

    function scrollToId(id: number) {
      const refs = jsonNodes.value[id] as HTMLElement[];
      if (!refs) return;
      if (refs.length) {
        refs[refs.length - 1].scrollIntoView({ block: 'center' });
      }
    }

    return { jsonNodes, scrollToId }
  }
});
</script>

<style lang="scss">
@import '../assets/style/resets';
@import '../assets/style/flatjson';
</style>
