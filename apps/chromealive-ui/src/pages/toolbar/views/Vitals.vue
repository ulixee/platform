<template>
  <div class="flex flex-col">


  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Header from '@/pages/toolbar/components/Header.vue';
import emitter from '@/pages/toolbar/emitter';

export default Vue.defineComponent({
  name: 'Worlds',
  components: { Header },
  methods: {
    close() {
      this.$emit('close');
    }
  },
  mounted() {
    emitter.emit('resizeWidth', 500);
  }
});

</script>
