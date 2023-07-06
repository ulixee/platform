<template>
  <div class="relative mb-6">
    <h1 class="mb-3">
      <Popover class="relative" v-slot="{ open }">
        <PopoverButton class="BUTTON font-bold tracking-widest text-xl text-[#A716B9] uppercase">
          <inline-svg :src="require(`@/assets/tool-icons/${productKey}.svg`)" height="30" class="inline mr-2" />
          <slot />
          <ChevronDownIcon :class="[open ? 'rotate-180' : '']" class="CHEVRON hidden h-7 relative -top-0.5 stroke-1 duration-100" />
        </PopoverButton>
        <ActiveToolsOverlay :subPath="subPath" />
      </Popover>
    </h1>

    <div class="absolute top-0 right-0 flex flex-row space-x-5 font-light">
      <router-link :to="`/${productKey}`" :class="[active === 'overview' ? 'font-bold' : '']">Overview</router-link>
      <router-link :to="`/${productKey}/example`" :class="[active === 'example' ? 'font-bold' : '']">Example Code</router-link>
      <router-link :to="`/${productKey}/roadmap`" :class="[active === 'roadmap' ? 'font-bold' : '']">Roadmap</router-link>
      <a :href="`https://documentation.ulixee.org/documentation/${productKey}`" class="">Documentation</a>
    </div>
    <div class="FADED-LINE"></div>
  </div>
</template>

<script lang="ts">
import * as Vue from "vue";
import { useRoute } from 'vue-router';
import { Popover, PopoverButton } from '@headlessui/vue'
import ActiveToolsOverlay from "@/components/ActiveToolsOverlay.vue";
import { ChevronDownIcon } from '@heroicons/vue/24/outline'

export default Vue.defineComponent({
  props: {
    productKey: {
      type: String,
      required: true,
    },
  },
  components: {
    ChevronDownIcon,
    Popover,
    PopoverButton,
    ActiveToolsOverlay
},
  setup() {
    const route = useRoute();
    const matches = route.path.match(/\/[^\/]+\/(example|roadmap)/);
    const active = matches ? matches[1] : 'overview';
    const subPath = matches ? `/${matches[1]}` : '/';
    return {
      active,
      subPath,
    }
  }
});
</script>

<style lang="scss" scoped>
.BUTTON:hover {
  .CHEVRON {
    display: inline-block;
  }
}
.FADED-LINE {
    width: 100%;
    height: 1px;
    background: linear-gradient(to right, rgb(200, 200, 200), 70%, rgba(200, 200, 200, 0) 100%);
  }
  a {
    text-decoration: none;
  }
</style>
