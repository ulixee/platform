<template>
  <Main />
</template>

<script lang="ts">
import * as Vue from 'vue';
import Main from './views/Main.vue';

export default Vue.defineComponent({
  name: 'App',
  components: {
    Main
  },
  setup() {
    return {};
  },
  methods: {},
});
</script>

<style lang="scss">
@import '../../assets/style/resets.scss';

html {
  padding: 0;
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont;
  font-size: 13px;
}

body {
  padding: 0;
  margin: 0;
  height: 100%;
}

#app {
  height: 100%;
}

</style>
