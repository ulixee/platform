<template>
  <div class="Json">
    <div
      class="JsonNode"
      v-for="node of json"
      :key="node.id"
      :ref="
        el => {
          jsonNodes[node.id] = el;
        }
      "
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
import { FlatJson } from '@/utils/flattenJson';
import { ref, defineComponent, onBeforeUpdate, onUpdated, PropType } from 'vue';

export default defineComponent({
  name: 'Json',
  components: {},
  props: {
    json: {
      type: Array as PropType<FlatJson[]>,
      required: true,
    },
    scrollToRecordId: Number,
  },
  setup(props) {
    const jsonNodes = ref<{ [id: number]: HTMLDivElement }>({});

    onBeforeUpdate(() => {
      jsonNodes.value = {};
    });

    onUpdated(() => {
      if (props.scrollToRecordId) scrollToId(props.scrollToRecordId);
    });

    function scrollToId(id: number) {
      const refs = jsonNodes.value[id];
      if (!refs) return;
      refs.scrollIntoView({ block: 'center' });
    }

    return { jsonNodes, scrollToId };
  },
});
</script>

<style lang="scss">
@import '../assets/style/resets';

.Json {
  font-family: 'Monaco', 'Menlo', 'Consolas', 'Bitstream Vera Sans Mono', monospace;
  font-size: 12px;
  text-align: left;

  .JsonNode {
    display: flex;
    position: relative;

    &.highlighted {
      background-color: #f3fbff;
    }

    .key {
      padding-right: 5px;
    }

    .brackets,
    .comma {
      color: #949494;
    }

    .indent {
      flex: 0 0 1em;
      border-left: 1px dashed #d9d9d9;
    }

    .comment {
      color: #bfcbd9;
    }

    .value-null {
      color: #ff4949;
    }

    .value-number {
      color: #1d8ce0;
    }

    .value-boolean {
      color: #1d8ce0;
    }

    .value-string {
      color: #13ce66;
    }
  }
}
</style>
