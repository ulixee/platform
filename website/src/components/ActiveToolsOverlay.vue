<template>
  <transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0 translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-1"
  >
    <PopoverPanel class="ActiveToolsOverlay Component absolute z-50 left-0 top-[100%] transform mt-3 px-2 w-screen max-w-md sm:px-0">
      <div class="bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden">
        <ul class='px-0.5'>
          <li>
            <router-link :to="`/documentation/hero`">
              <inline-svg :src="require('@/assets/tool-icons/hero.svg')" />
              <div>
                <header>Hero</header>
                <p>The programmable web browser that's nearly impossible to block.</p>
              </div>
            </router-link>
          </li>
          <li>
            <router-link :to="`/documentation/desktop`">
              <inline-svg :src="require('@/assets/tool-icons/desktop.svg')" />
              <div>
                <header>Desktop</header>
                <p>Create, optimize and debug your scripts across multiple envs.</p>
              </div>
            </router-link>
          </li>
          <li>
            <router-link :to="`/documentation/datastore`">
              <inline-svg :src="require('@/assets/tool-icons/datastore.svg')" />
              <div>
                <header>Datastores</header>
                <p>Package your data scripts as discrete, composable units ready to deploy.</p>
              </div>
            </router-link>
          </li>
          <li>
            <router-link :to="`/documentation/cloud`">
              <inline-svg :src="require('@/assets/tool-icons/cloud.svg')" />
              <div>
                <header>Cloud</header>
                <p>Easily run and scale your Datastores across production and localhost.</p>
              </div>
            </router-link>
          </li>
          <li class='COMING-SOON'>
            <div>
              <inline-svg :src="require('@/assets/tool-icons/stream.svg')" />
              <div>
                <header>Stream</header>
                <p>Integrate Ulixee's public and private datasets into your codebase.</p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </PopoverPanel>
  </transition>
</template>

<script lang="ts">
import * as Vue from "vue";
import { PopoverPanel } from '@headlessui/vue'

export default Vue.defineComponent({
  props: {
    subPath: {
      default: '',
    }
  },
  components: {
    PopoverPanel,
  }
});
</script>

<style lang="scss">
.ActiveToolsOverlay {
  ul li {
    @apply border-t py-0.5;
    &:first-child {
      @apply border-none;
      a:hover {
        @apply rounded-t;
      }
    }
    a {
      @apply no-underline;
      &:hover {
        @apply bg-slate-100;
      }
    }
    a, &.COMING-SOON > div {
      @apply block flex flex-row items-start px-4 py-3;
    }
    &.COMING-SOON {
      @apply opacity-50;
      header:after {
        content: 'Coming Soon';
        @apply font-light uppercase text-xs bg-[#f4eff4] border border-[#b6b4b6] rounded-lg px-2 ml-2;
      }
    }
    svg {
      @apply mr-3 w-8 relative top-1;
      height: auto;
    }
    header {
      @apply font-bold text-gray-900;
    }
    p {
      @apply font-light text-gray-600 text-base;
    }
  }
}
</style>