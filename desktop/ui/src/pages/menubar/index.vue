<template>
  <Main />
</template>

<script lang="ts">
import * as Vue from 'vue';
import Main from './views/Main.vue';

export default Vue.defineComponent({
  name: 'App',
  components: {
    Main,
  },
  methods: {},
});
</script>

<style lang="scss">
@import '../../assets/style/resets.scss';

html {
  @apply h-full bg-gray-100;
}
</style>
