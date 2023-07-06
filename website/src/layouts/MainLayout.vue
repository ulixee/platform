<template>
  <div :class="[isFixed ? 'pt-[3.25rem]' : '', isDark ? 'isDark' : '']">
    <MainNav />

    <div :class="[showPadding ? 'p-24' : '']" class="min-h-screen">
      <slot />
    </div>

    <Footer />
  </div>
</template>

<script lang="ts">
import * as Vue from "vue";
import SearchForm from './SearchForm.vue';
import Footer from '@/layouts/Footer.vue';

export default Vue.defineComponent({
  props: {
    showPadding: {
      type: Boolean,
      default: true,
    },
    navBgColor: {
      type: String,
    },
    isFixed: {
      type: Boolean,
      default: true,
    }
  },
  components: {
    SearchForm,
    Footer,
  },
  setup(props: any) {
    return {
      isDark: props.navBgColor ? true : false,
      backgroundColor: props.navBgColor ? props.navBgColor : '#FAFBFB',
    }
  },
  methods: {}
});
</script>

<style lang="scss" scoped>
.isDark {
  svg.LOGO {
    path {
      fill: #FDCCFF;
    }
  }
  a, button {
    color: #FDCCFF;
  }
}

a.Logo {
  text-decoration: none;
}
</style>
