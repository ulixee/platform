<template>
  <Popover class="relative" v-slot="{ open }">
    <PopoverButton
      :class="[open ? 'text-gray-900' : 'text-purple-900', 'font-light group inline-flex items-center hover:text-gray-900 focus:outline-none focus:ring-0']"
    >
      <span>Data Tools</span>
      <ChevronDownIcon
        :class="[open ? 'text-gray-600 rotate-180' : 'text-purple-900', 'h-4 w-4 ml-1 stroke-1 duration-100 group-hover:text-gray-500']"
        aria-hidden="true"
      />

    </PopoverButton>
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <PopoverPanel class="absolute z-10 left-0 transform mt-3 px-2 w-screen max-w-4xl sm:px-0">
        <div class="bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden">
          <div class="grid grid-cols-2 p-5 space-x-2">
            <div class="column pr-2 border-r">
              <div class="border-b text-purple-400 font-bold pb-2">For Data Extractors</div>

              <ul>
                <NavItem>
                  <router-link to="/hero">
                    <inline-svg :src="require('@/assets/tool-icons/hero.svg')" />
                    <div>
                      <header>Hero</header>
                      <p>The programmable web browser that's nearly impossible to block.</p>
                    </div>
                  </router-link>
                </NavItem>
                <NavItem>
                  <router-link to="/chromealive">
                    <inline-svg :src="require('@/assets/tool-icons/chromealive.svg')" />
                    <div>
                      <header>ChromeAlive</header>
                      <p>The interactive tool that makes writing scraper scripts pure joy.</p>
                    </div>
                  </router-link>
                </NavItem>
                <NavItem>
                  <router-link to="/databox">
                    <inline-svg :src="require('@/assets/tool-icons/databox.svg')" />
                    <div>
                      <header>Databoxes</header>
                      <p>Package your data scripts as discrete, composable units ready to deploy.</p>
                    </div>
                  </router-link>
                </NavItem>
                <NavItem>
                  <router-link to="/miner">
                    <inline-svg :src="require('@/assets/tool-icons/server.svg')" />
                    <div>
                      <header>Miner</header>
                      <p>Easily run and scale your Databoxes across production and localhost.</p>
                    </div>
                  </router-link>
                </NavItem>
                <NavItem :isComingSoon="true">
                  <div>
                    <inline-svg :src="require('@/assets/tool-icons/domain.svg')" />
                    <div>
                      <header>Domains</header>
                      <p>Currated data APIs that are ownable, managable and monetizable.</p>
                    </div>
                  </div>
                </NavItem>
                <NavItem :isComingSoon="true">
                  <div>
                    <inline-svg :src="require('@/assets/tool-icons/manager.svg')" />
                    <div>
                      <header>Manager</header>
                      <p>Create, optimize and debug your scripts across multiple envs</p>
                    </div>
                  </div>
                </NavItem>
              </ul>
            </div>
            <div class="column">
              <div class="border-b text-purple-400 font-bold pb-2">For Data Consumers</div>
              <ul>
                <NavItem>
                  <router-link to="/stream">
                    <inline-svg :src="require('@/assets/tool-icons/stream.svg')" />
                    <div>
                      <header>Stream</header>
                      <p>Integrate Ulixee's public and private datasets into your codebase.</p>
                    </div>
                  </router-link>
                </NavItem>
                <NavItem :isComingSoon="true">
                  <div>
                    <inline-svg :src="require('@/assets/tool-icons/marketplace.svg')" />
                    <div>
                      <header>Marketplace</header>
                      <p>Browse publicly available datasets from around the world.</p>
                    </div>
                  </div>
                </NavItem>
                <NavItem :isComingSoon="true">
                  <div>
                    <inline-svg :src="require('@/assets/tool-icons/pipeline.svg')" />
                    <div>
                      <header>Pipeline</header>
                      <p>Manage all your data consumption and billing from a simple UI.</p>
                    </div>
                  </div>
                </NavItem>
              </ul>
            </div>
          </div>
          <div class="px-5 py-5 bg-gray-50 space-y-6 sm:flex sm:space-y-0 sm:space-x-10 sm:px-8">
            <div class="flow-root">Install Ulixee.app</div>
          </div>
        </div>
      </PopoverPanel>
    </transition>
  </Popover>
</template>

<script lang="ts">
import * as Vue from "vue";
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/outline'
import NavItem from '../NavItem.vue';

export default Vue.defineComponent({
  components: {
    Popover, PopoverButton, PopoverPanel,
    ChevronDownIcon,
    NavItem
  }
});
</script>

