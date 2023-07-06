<template>
  <Suspense>
    <div>
      <MainNav v-if='$route.fullPath !== "/"' />
      <div class="min-h-screen">
        <router-view :key="$route.fullPath" />
      </div>
      <Footer v-if='$route.fullPath !== "/"' />
    </div>
  </Suspense>
</template>

<script lang="ts">
  import * as Vue from 'vue';
  import { useRoute } from 'vue-router';
  import MainNav from '@/layouts/MainNav.vue';
  import Footer from '@/layouts/Footer.vue';

  export default Vue.defineComponent({
    components: {
      MainNav,
      Footer,
    },
    setup() {
      const $route = useRoute();
      console.log($route.fullPath);
      return {};
    },
  });
</script>
