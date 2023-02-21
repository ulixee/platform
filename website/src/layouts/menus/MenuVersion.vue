<template>
  <Popover class="relative" v-slot="{ open }">

    <div class="px-[2px] border-l border-gray-300">
      <PopoverButton :class="[open ? 'text-gray-900' : 'text-purple-900', 'h-[34px] px-3 relative -mr-3 font-light group inline-flex items-center rounded hover:bg-ulixee-verylight']">
        <span class="hidden md:inline-block whitespace-nowrap">v2.0-alpha</span>
        <ChevronDownIcon :class="[open ? 'text-gray-600' : 'text-purple-900', 'h-4 w-4 stroke-1 group-hover:text-gray-500']" aria-hidden="true" />
      </PopoverButton>
    </div>
    <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-1">
      <PopoverPanel class="absolute z-10 right-0 transform mt-3 px-2 w-screen max-w-xs sm:px-0">
        <div class="rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden">
          <div class="relative grid gap-6 bg-white px-2 py-3 sm:gap-8 sm:p-2">
            <div>
              <div class="column text-right">
                <ul>
                  <!-- <li>
                    <a href="https://github.com/ulixee/platform/CHANGELOG.md" class="no-underline">Changelog</a>
                  </li>
                  <li>
                    <router-link to="/roadmap" class="no-underline">Platform Roadmap</router-link>
                  </li> -->
                  <li>
                    <a href="https://github.com/ulixee" class="no-underline">Github Repositories</a>
                  </li>
                  <li>
                    <router-link to="/how-to-contribute" class="no-underline">How To Contribute</router-link>
                  </li>
                 <li>
                    <router-link to="/code-of-conduct" class="no-underline">Code of Conduct</router-link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </PopoverPanel>
    </transition>
  </Popover>
</template>

<script lang="ts">
import * as Vue from "vue";
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'

export default Vue.defineComponent({
  components: {
    Popover, PopoverButton, PopoverPanel,
    ChevronDownIcon,
  }
});
</script>

<style lang="scss" scoped>
.coming-soon {
  opacity: 0.5;
}
</style>
