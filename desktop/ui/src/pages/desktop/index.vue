<template>
  <div class="y-0 l-0 r-0 drag-bar absolute h-8 w-full">
&nbsp;
  </div>
  <Sidebar />

  <div class="flex flex-col pl-64">
    <main class="flex-1">
      <div class="py-6">
        <div class="mx-auto max-w-7xl px-8">
          <div class="transition-opacity duration-150 ease-linear">
            <RouterView />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { RouterView } from 'vue-router';
import Sidebar from './views/Sidebar.vue';
import Datastores from "./views/Datastores.vue";

export default Vue.defineComponent({
  name: 'App',
  components: {
    Sidebar,
    Datastores,
    RouterView,
  },
  setup() {
    document.title = 'Ulixee Desktop';
  },
  methods: {},
});
</script>

<style lang="scss">
@import '../../assets/style/resets.scss';

html {
  @apply h-full bg-gray-100;
}

body {
  @apply h-full;
  padding: 0;
  margin: 0;
  height: 100%;
}

#app {
  height: 100%;
}
.drag-bar {
  -webkit-app-region: drag;
}
</style>
