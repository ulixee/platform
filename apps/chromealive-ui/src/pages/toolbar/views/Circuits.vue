<template>
  <div class="flex flex-col">
    <ol>
      <li>
        after-goto
      </li>
    </ol>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Header from '@/pages/toolbar/components/Header.vue';
import emitter from '@/pages/toolbar/emitter';

export default Vue.defineComponent({
  name: 'Circuits',
  components: { Header },
  mounted() {
    emitter.emit('resizeWidth', 500);
  },
  methods: {}
});

</script>
