<template>
<Popover class="relative" v-slot="{ open }">
    <PopoverButton :class="[open ? 'text-gray-900' : 'font-light text-900', 'group inline-flex items-center hover:text-gray-900 focus:outline-none focus:ring-0']">
      <span>Economic Tools</span>
      <ChevronDownIcon :class="[open ? 'text-gray-600 rotate-180' : 'text-purple-900', 'h-4 w-4 ml-1 stroke-1 duration-100 group-hover:text-gray-500']" aria-hidden="true" />
    </PopoverButton>
    <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-1">
      <PopoverPanel class="absolute z-10 left-0 transform mt-3 px-2 w-screen max-w-3xl sm:px-0">
        <div class="rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 overflow-hidden">
          <div class="relative grid p-5">
            <div class="border-b text-purple-400 font-bold pb-2">The Infrastructure for a Global Data Economy</div>
            <div class="grid grid-cols-2">
              <div class="column">
                <ul>
                  <NavItem :isComingSoon="true">
                    <div>
                      <inline-svg :src="require('@/assets/tool-icons/argon.svg')" />
                      <div>
                        <header>Argon Stablecoin</header>
                        <p>Universal micro-payments pegged to the Consumer Price Index.</p>
                      </div>
                    </div>
                  </NavItem>

                  <NavItem :isComingSoon="true">
                    <div>
                      <inline-svg :src="require('@/assets/tool-icons/sidechain.svg')" />
                      <div>
                        <header>Federated Sidechain</header>
                        <p>Fast settling transactional engine for permissionless data queries.</p>
                      </div>
                    </div>
                  </NavItem>

                  <NavItem :isComingSoon="true">
                    <div>
                      <inline-svg :src="require('@/assets/tool-icons/bonds.svg')" />
                      <div>
                        <header>Stabilization Bonds</header>
                        <p>Financial mechanism to provide responsive algorithmic stabilization.</p>
                      </div>
                    </div>
                  </NavItem>
                </ul>
              </div>
              <div class="column">
                <ul>
                  <NavItem :isComingSoon="true">
                    <div>
                      <inline-svg :src="require('@/assets/tool-icons/mining.svg')" />
                      <div>
                        <header>Mining Operations</header>
                        <p>Computational nodes that deliver data queries and mine the block chain.</p>
                      </div>
                    </div>
                  </NavItem>

                  <NavItem :isComingSoon="true">
                    <div>
                      <inline-svg :src="require('@/assets/tool-icons/nfts.svg')" />
                      <div>
                        <header>Revenue Generating NFTs</header>
                        <p>Domains and Databoxes as self-contained tradable business.</p>
                      </div>
                    </div>
                  </NavItem>

                  <NavItem :isComingSoon="true">
                    <div>
                      <inline-svg :src="require('@/assets/tool-icons/services.svg')" />
                      <div>
                        <header>External Services</header>
                        <p>Services to simplify the setup and management of mining operations.</p>
                      </div>
                    </div>
                  </NavItem>
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

<style lang="scss" scoped>
.COMING-SOON {
  opacity: 0.5;
}
</style>