<template>
  <div class="Finder absolute">
    <div v-if="isSelectMode" class="waiting-for-selection">waiting for element...</div>
    <div v-else class="overlay-box">
      <div class="form p-3">
        <div class="flex flex-row">
          <input ref="inputElem" type="text" placeholder="Search page assets..." class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none " />
          <img @click="enableSelectMode" src="@/assets/icons/node_search_icon.svg" class="icon h-6 ml-3 mr-2 mt-2" />
        </div>
      </div>
      <div class="results p-5">
        <Listbox as="div" v-if="results" v-model="selectedFilter" class="flex flex-row items-stretch">
          <ListboxLabel class="block text-sm font-medium text-gray-700">Filter by</ListboxLabel>
          <div class="mt-1 relative">
            <ListboxButton class="relative w-full border border-gray-300 rounded-md shadow-sm pl-3 pr-10 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <span class="block truncate">{{ selectedFilter.name }}</span>
              <span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <SelectorIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </ListboxButton>

            <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <ListboxOptions class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                <ListboxOption as="template" v-for="filter in filters" :key="filter.id" :value="filter" v-slot="{ active, selected }">
                  <li :class="[active ? 'text-white bg-indigo-600' : 'text-gray-900', 'cursor-default select-none relative py-2 pl-8 pr-4']">
                    <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                      {{ filter.name }}
                    </span>

                    <span v-if="selected" :class="[active ? 'text-white' : 'text-indigo-600', 'absolute inset-y-0 left-0 flex items-center pl-1.5']">
                      <CheckIcon class="h-5 w-5" aria-hidden="true" />
                    </span>
                  </li>
                </ListboxOption>
              </ListboxOptions>
            </transition>
          </div>
        </Listbox>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import * as Vue from 'vue';
  import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from '@headlessui/vue'
  import { CheckIcon, SelectorIcon } from '@heroicons/vue/solid'

  const filters = [
    { id: 'all', name: 'Show All' },
    { id: 'elements', name: 'DOM Elements' },
    { id: 'resources', name: 'Resources' },
  ];

  export default Vue.defineComponent({
    name: 'Finder',
    components: {
      Listbox,
      ListboxButton,
      ListboxLabel,
      ListboxOption,
      ListboxOptions,
      CheckIcon,
      SelectorIcon,
    },
    setup() {
      return {
        filters,
        inputElem: Vue.ref<HTMLInputElement>(),
        selectedFilter: Vue.ref(filters[0]),
        isSelectMode: Vue.ref(false),
      }
    },
    methods: {
      enableSelectMode() {
        this.isSelectMode = true;
      }
    },
    mounted() {
      this.inputElem.focus();
    },
  });
</script>

<style lang="scss" scoped="scoped">
  @use "sass:math";

  .Finder {
    z-index: 20;
    height: 100%;
    width: 100%;
  }

  .overlay-box {
    margin: 9px 11px 11px 9px;
    border: 1px solid rgba(0,0,0,0.25);
    border-radius: 7px;
    background: white;
    box-shadow: 1px 1px 10px 1px rgba(0,0,0,0.3);
    width: calc(100% - 20px);
    height: calc(100% - 20px);
  }

  .waiting-for-selection {
    width: 100%;
    border: 1px solid rgba(0,0,0,0.25);
    border-radius: 4px;
    box-shadow: 1px 1px 10px 1px rgba(0,0,0,0.3);
  }

  .icon {
    opacity: 0.5;
    &:hover {
      opacity: 1;
    }
  }

  .form {
    @apply bg-gray-100;
    border-radius: 7px 7px 0 0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }

  .results {
    min-height: 200px;
  }
</style>
