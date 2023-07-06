<template>
    <div class="AboveTheFold relative pt-[53px]">
      <div class='AboveTheFoldContent relative text-white w-full flex items-center pl-5 md:pl-12 lg:pl-20 2xl:pl-32 py-24'>
        <div class="BLOCKS absolute py-[8px] pl-5 md:pl-0 w-9/12 md:w-8/12 lg:w-7/12 2xl:w-6/12 h-full top-0 right-0 z-10 overflow-hidden">
          <div class="BLOCK-ROW">
            <div v-for="i of rows[0]">
              <LegoBlock :logo="getLogo()" purple />
            </div>
          </div>
          <div class="BLOCK-ROW">
            <div class="spacer min-w-[120px]"></div>
            <div v-for="i in rows[1]">
              <LegoBlock :logo="getLogo()" purple />
            </div>
          </div>
          <div class="BLOCK-ROW">
            <div class="spacer min-w-[240px]"></div>
            <div v-for="i in rows[2]">
              <LegoBlock :logo="getLogo()" purple />
            </div>
          </div>
          <div class="BLOCK-ROW">
            <div class="spacer min-w-[300px]"></div>
            <div v-for="i in rows[3]">
              <LegoBlock :logo="getLogo()" purple />
            </div>
          </div>
          <div class="BLOCK-ROW">
            <div class="spacer min-w-[350px]"></div>
            <div v-for="i in rows[4]">
              <LegoBlock :logo="getLogo()" purple />
            </div>
          </div>
          <div class="BLOCK-ROW">
            <div class="spacer min-w-[300px]"></div>
            <div v-for="i in rows[5]">
              <LegoBlock :logo="getLogo()" purple />
            </div>
          </div>
          <div class="BLOCK-ROW">
            <div class="spacer min-w-[350px]"></div>
            <div v-for="i in rows[6]">
              <LegoBlock :logo="getLogo()" purple />
            </div>
          </div>
          <div class="BLOCK-ROW">
            <div class="spacer min-w-[280px]"></div>
            <div v-for="i in rows[7]">
              <LegoBlock :logo="getLogo()" purple />
            </div>
          </div>
          <div class="BLOCK-ROW">
            <div class="spacer min-w-[400px]"></div>
            <div v-for="i in rows[8]">
              <LegoBlock :logo="getLogo()" purple />
            </div>
          </div>
          <div class="BLOCK-ROW">
            <div class="spacer min-w-[300px]"></div>
            <div v-for="i in rows[9]">
              <LegoBlock :logo="getLogo()" purple />
            </div>
          </div>
          <div class="BLOCK-ROW">
            <div class="spacer min-w-[200px]"></div>
            <div v-for="i in rows[10]">
              <LegoBlock :logo="getLogo()" purple />
            </div>
          </div>
          <div class="BLOCK-ROW">
            <div class="spacer min-w-[100px]"></div>
            <div v-for="i in rows[11]">
              <LegoBlock :logo="getLogo()" purple />
            </div>
          </div>
          <div class="BLOCK-ROW hidden lg:block">
            <div v-for="i in rows[12]">
              <LegoBlock :logo="getLogo()" purple />
            </div>
          </div>
        </div>
        <div>
          <h1 class="mb-6">
            <div class="font-bold text-lg md:text-2xl xl:text-2xl opacity-75 tracking-[0.2em]">ULIXEE'S DATANET</div>
            <div class="mt-3 font-black text-3xl md:text-6xl lg:text-7xl xl:text-8xl leading-[1.2em]"><span class="md:block">THE OPEN DATA</span> PLATFORM</div>
          </h1>

          <p class="font-extralight w-7/12 md:w-5/12 text-md md:text-xl my-5">Ulixee is creating an ecosystem where every website is an API and every developer can innovate new ideas atop the world’s data.</p>

          <ul class="flex flex-row font-bold">
            <li>
              <Popover class="relative" v-slot="{ open }">
                <PopoverButton
                  :class="[open ? 'text-purple-400' : 'text-white', 'font-light group inline-flex items-center decoration-purple-400']"
                >
                  <span>Explore Our Tools</span>
                  <ChevronDownIcon
                    :class="[open ? 'text-purple-400' : 'text-white', 'h-5 w-5 ml-1']"
                    aria-hidden="true"
                  />
                </PopoverButton>
                <ActiveToolsOverlay />
              </Popover>
            </li>
            <li class="font-light opacity-50 mx-5">or</li>
            <li>
              <router-link to="/documentation/datastore" class="text-white decoration-purple-400">Start Building</router-link>
            </li>
          </ul>
        </div>
      </div>
    </div>
</template>

<script lang='ts'>
import * as Vue from "vue";
import getLogo from '@/lib/logosForHomepage';
import { Popover, PopoverButton } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/24/solid'
import ActiveToolsOverlay from "@/components/ActiveToolsOverlay.vue";
import LegoBlock from '@/components/LegoBlock.vue';

const rows = [
  5,
  4,
  4,
  4,
  3,
  4,
  3,
  4,
  3,
  4,
  4,
  5,
  5,
];

export default Vue.defineComponent({
  components: {
    Popover,
    PopoverButton,
    ChevronDownIcon,
    ActiveToolsOverlay,
    LegoBlock,
  },
  setup() {
    return {
      rows,
    }
  },
  methods: {
    getLogo,
  },
});
</script>

<style lang="scss">
  .AboveTheFold {
    background: linear-gradient(to bottom, #780F85, #A428B3);

    .AboveTheFoldContent {
      min-height: calc(100vh - 3.25rem);
    }

    .BLOCK-ROW {
      @apply flex flex-row h-[7.6923076923%] min-h-[45px]; // lg:h-[8.333333%]
      padding-bottom: 8px;
    }
  }
</style>
