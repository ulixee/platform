<template>
  <div class="flex flex-col">

  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import emitter from '@/pages/toolbar/emitter';

export default Vue.defineComponent({
  name: 'Worlds',
  mounted() {
    emitter.emit('resizeWidth', 500);
  }
});

</script>
