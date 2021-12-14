<template>
  <div class="flex flex-col">
    <ol>
      <li>
        #test.class
      </li>
    </ol>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import emitter from '@/pages/toolbar/emitter';

export default Vue.defineComponent({
  name: 'Selectors',
  mounted() {
    emitter.emit('resizeWidth', 500);

  },
});

</script>
