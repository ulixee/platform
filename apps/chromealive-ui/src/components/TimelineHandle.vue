<template>
  <div
    :id="id"
    class="handle"
    :class="{ disabled: !isDraggable }"
    @mousedown="startDragging()"
  ></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'TimelineHandle',
  components: {},
  props: {
    isDraggable: {
      type: Boolean,
      default: true,
    },
    id: String,
  },
  emits: ['drag', 'dragstart', 'dragend'],
  setup() {},
  methods: {
    startDragging() {
      if (!this.isDraggable) return;
      window.addEventListener('mousemove', this.onDrag);
      this.$emit('dragstart');
    },

    stopDragging() {
      window.removeEventListener('mousemove', this.onDrag);
      this.$emit('dragend');
    },

    onDrag(e) {
      e.preventDefault();

      this.$emit('drag', e);
    },
  },
  mounted() {
    window.addEventListener('mouseup', this.stopDragging);
  },
});
</script>
<style lang="scss">
.handle {
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
}
</style>
