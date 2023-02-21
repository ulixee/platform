<template>
  <div :class="[isFixed ? 'pt-[3.25rem]' : '', isDark ? 'isDark' : '']">
    <nav :class="[isFixed ? 'fixed' : '', isDark ? 'border-black' : 'border-gray-300']" class="w-full top-0 border-b px-5 text-sm z-50" :style="{ backgroundColor }">
      <div @click="toggleSearch" v-if="searchIsActive" class="absolute top-0 left-0 h-full z-40 inset-0 bg-black bg-opacity-30" style="height: calc(100% + 1px)"></div>
      <div class="flex flex-row items-stretch h-[3.25rem]">
        <ul v-if="!searchIsActive" class="left-column font-light flex flex-row items-stretch content-center space-x-5 relative top-[0.5px] text-base">
          <li class="flex flex-row items-stretch">
            <router-link to="/" class="flex flex-row no-underline items-center">
              <inline-svg :src="require('@/assets/logos/ulixee.svg')" height="23" class="LOGO inline-block mr-1 relative top-[0.5px]" />
              <span class="font-bold font-md">Ulixee</span>
            </router-link>
          </li>
          <li :class="[isSelected('home') ? 'isSelected' : '']" class="hidden md:flex flex-row items-stretch">
            <router-link to="/" class="no-underline flex flex-row items-center"><span>Home</span></router-link>
          </li>
          <!-- <li class="flex flex-row items-center">
            <MenuDataTools />
          </li>
          <li class="flex flex-row items-center">
            <MenuEconomicTools />
          </li>    -->
          <!-- <li class="flex flex-row items-center">
            <router-link to="/getting-started" class="no-underline">Getting Started</router-link>
          </li> -->
          <li class="flex flex-row items-stretch">
            <Popover :class="[isSelected('docs') ? 'isSelected' : '']" class="relative flex flex-row items-stretch" v-slot="{ open }">
              <PopoverButton :class="[open ? 'text-gray-900' : 'text-purple-900', 'font-light group inline-flex items-center hover:text-gray-900 focus:outline-none focus:ring-0']">
                <span>Docs</span>
                <ChevronDownIcon
                  :class="[open ? 'text-gray-600 rotate-180' : 'text-purple-900', 'h-4 w-4 ml-1 stroke-1 duration-100 group-hover:text-gray-500']"
                  aria-hidden="true"
                />
              </PopoverButton>
              <DocumentationMenu />
            </Popover>
          </li>
        </ul>

        <ul class="flex-1 flex flex-row justify-end">
          <li :class="[searchIsActive ? 'w-full' : '']" class="flex flex-row items-center">
            <div v-if="searchIsActive" class="w-full">
              <Teleport to="body">
                <div @click="toggleSearch" class="fixed inset-0 bg-black bg-opacity-30 transition-opacity h-screen w-screen z-30"></div>
              </Teleport>
              <SearchForm class="px-[2px] relative z-50" />
            </div>
            <div v-else class="px-[2px] border-l border-gray-300">
              <div @click="toggleSearch" class="cursor-pointer block h-[34px] w-[34px] pt-[5px] text-center rounded hover:bg-ulixee-verylight">
                <inline-svg :src="require('@/assets/logos/search.svg')" class="inline-block text-ulixee-normal" />
              </div>
            </div>
          </li>
          <li class="flex flex-row items-center">
            <div class="px-[2px] border-l border-gray-300">
              <a aria-label="Discord" href="//discord.gg/tMAycnemHU" class="block h-[34px] w-[34px] pt-[5px] text-center rounded hover:bg-ulixee-verylight" target="_blank" title="Join our discord">
                <inline-svg :src="require('@/assets/logos/discord.svg')" height="23" class="inline-block relative top-px text-ulixee-normal" />
              </a>
            </div>
          </li>
          <li class="flex flex-row items-center">
            <div class="px-[2px] border-l border-gray-300">
              <a aria-label="Discord" href="https://github.com/ulixee" class="block h-[34px] w-[34px] pt-[5px] text-center rounded hover:bg-ulixee-verylight" target="_blank" title="Open Ulixee's Github">
                <inline-svg :src="require('@/assets/logos/github.svg')" height="24" class="inline-block text-ulixee-normal" />
              </a>
            </div>
          </li>
          <li class="flex flex-row items-center">
            <MenuVersion/>
          </li>
        </ul>
      </div>
    </nav>
    <div :class="[showPadding ? 'p-24' : '']" class="min-h-screen">
      <slot />
    </div>
    <Footer />
  </div>
</template>

<script lang="ts">
import * as Vue from "vue";
import { Popover, PopoverButton } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import MenuDataTools from './menus/MenuDataTools.vue';
import MenuEconomicTools from './menus/MenuEconomicTools.vue';
import MenuVersion from './menus/MenuVersion.vue';
import DocumentationMenu from './menus/DocumentationMenu.vue';
import Footer from './Footer.vue';
import SearchForm from './SearchForm.vue';

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
    Popover, PopoverButton,
    ChevronDownIcon,
    MenuDataTools,
    MenuEconomicTools,
    MenuVersion,
    Footer,
    SearchForm,
    DocumentationMenu,
  },
  setup(props) {
    return {
      searchIsActive: Vue.ref(false),
      isDark: props.navBgColor ? true : false,
      backgroundColor: props.navBgColor ? props.navBgColor : '#FAFBFB',
    }
  },
  methods: {
    toggleSearch() {
      this.searchIsActive = !this.searchIsActive;
    },
    isSelected(name: string) {
      if (name === 'home' && this.$route.path === '/') {
        return true;
      } else if (name === 'docs' && this.$route.path.startsWith('/docs')) {
        return true;
      }
      return false;
    }
  }
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
  .isSelected > a, .isSelected button {
    @apply relative;
    &:after {
      content: '';
      @apply absolute bottom-px left-0 w-full h-[2px] bg-ulixee-normal opacity-50;
    }
  }
</style>
