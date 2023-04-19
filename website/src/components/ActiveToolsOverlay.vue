<template>
  <transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0 translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-1"
  >
    <PopoverPanel class="absolute z-10 left-0 top-[100%] transform mt-3 px-2 w-screen max-w-4xl sm:px-0">
      <div class="bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden">
        <div class="column pr-2 border-r">
          <ul>
            <NavItem>
              <router-link :to="`/hero${subPath}`">
                <inline-svg :src="require('@/assets/tool-icons/hero.svg')" />
                <div>
                  <header>Hero</header>
                  <p>The programmable web browser that's nearly impossible to block.</p>
                </div>
              </router-link>
            </NavItem>
            <NavItem>
              <router-link :to="`/chromealive${subPath}`">
                <inline-svg :src="require('@/assets/tool-icons/chromealive.svg')" />
                <div>
                  <header>ChromeAlive</header>
                  <p>The interactive tool that makes writing scraper scripts pure joy.</p>
                </div>
              </router-link>
            </NavItem>
            <NavItem>
              <router-link :to="`/datastore${subPath}`">
                <inline-svg :src="require('@/assets/tool-icons/datastore.svg')" />
                <div>
                  <header>Datastore</header>
                  <p>Package your data scripts as discrete, composable units ready to deploy.</p>
                </div>
              </router-link>
            </NavItem>
            <NavItem>
              <router-link :to="`/cloud${subPath}`">
                <inline-svg :src="require('@/assets/tool-icons/server.svg')" />
                <div>
                  <header>Cloud</header>
                  <p>Easily run and scale your Datastores across production and localhost.</p>
                </div>
              </router-link>
            </NavItem>
            <NavItem>
              <router-link :to="`/stream${subPath}`">
                <inline-svg :src="require('@/assets/tool-icons/stream.svg')" />
                <div>
                  <header>Stream</header>
                  <p>Integrate Ulixee's public and private datasets into your codebase.</p>
                </div>
              </router-link>
            </NavItem>
          </ul>
        </div>
        <div class="px-5 py-5 bg-gray-50 space-y-6 sm:flex sm:space-y-0 sm:space-x-10 sm:px-8">
          <div class="flow-root">Install Ulixee.app</div>
        </div>
      </div>
    </PopoverPanel>
  </transition>
</template>

<script lang="ts">
import * as Vue from "vue";
import { PopoverPanel } from '@headlessui/vue'
import NavItem from '../layouts/NavItem.vue';

export default Vue.defineComponent({
  props: {
    subPath: {
      default: '',
    }
  },
  components: {
    PopoverPanel,
    NavItem
  }
});
</script>

