<template>
  <Suspense class="App">
    <router-view :key="$route.fullPath" />
  </Suspense>
</template>

<script lang="ts">
  import * as Vue from "vue";

  export default Vue.defineComponent({ });
</script>
