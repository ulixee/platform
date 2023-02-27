<template>
  <footer class="FOOTER bg-[#E9ECF0] border-t border-slate-300" style="box-shadow: inset 0 1px 0 white">
    <!-- <div class="px-16">
      <section class="relative mx-auto -top-16 -mb-3 pt-5 pb-5 max-w-4xl bg-white rounded border border-gray-300 text-gray-800 text-center shadow">
        <div class="flex flex-row mx-auto w-10/12 text-center">
          <inline-svg :src="require('@/assets/footer-icons/face1.svg')" height="30" class="inline-block relative top-7 w-1/5" />
          <inline-svg :src="require('@/assets/footer-icons/face2.svg')" height="30" class="inline-block relative top-3 w-1/5" />
          <inline-svg :src="require('@/assets/footer-icons/face3.svg')" height="30" class="inline-block relative top-0 w-1/5" />
          <inline-svg :src="require('@/assets/footer-icons/face4.svg')" height="30" class="inline-block relative top-3 w-1/5" />
          <inline-svg :src="require('@/assets/footer-icons/face5.svg')" height="30" class="inline-block relative top-7 w-1/5" />
        </div>
        <header class="font-bold text-xl mt-8">THE FREEDOM TO INNOVATE</header>
        <p class="pb-7 text-md font-extralight mt-1 mx-10 text-center">
          Our mission is to create a more open, more connected and more innovative world. We will do that by empowering developers with tools to integrate the world's knowledge into their apps, websites, and AI algorithms.
        </p>
      </section>

      <section class="SITEMAP flex flex-row space-x-10 mt-0 max-w-6xl mx-auto">
        <div class="w-1/3">
          <header>
            TOOLS FOR DATA<br />
            EXTRACTORS
          </header>
          <ul>
            <li>
              <router-link to="/hero">
                <inline-svg :src="require('@/assets/tool-icons/hero.svg')" />
                <label>Hero</label>
              </router-link>
            </li>
            <li>
              <router-link to="/chromealive">
                <inline-svg :src="require('@/assets/tool-icons/chromealive.svg')" />
                <label>ChromeAlive</label>
              </router-link>
            </li>
            <li>
              <router-link to="/datastore">
                <inline-svg :src="require('@/assets/tool-icons/datastore.svg')" />
                <label>Datastores</label>
              </router-link>
            </li>
            <li>
              <router-link to="/cloud">
                <inline-svg :src="require('@/assets/tool-icons/server.svg')" />
                <label>Cloud</label>
              </router-link>
            </li>
            <li class="COMING-SOON">
              <inline-svg :src="require('@/assets/tool-icons/domain.svg')" />
              <label>Domains</label>
            </li>
            <li class="COMING-SOON">
              <inline-svg :src="require('@/assets/tool-icons/manager.svg')" />
              <label>Manager</label>
            </li>
          </ul>
        </div>

        <div class="VERTICAL-LINE"></div>

        <div class="w-1/3">
          <header>
            TOOLS FOR DATA<br />
            CONSUMERS
          </header>
          <ul>
            <li>
              <router-link to="/stream">
                <inline-svg :src="require('@/assets/tool-icons/stream.svg')" />
                <label>Stream</label>
              </router-link>
            </li>
            <li class="COMING-SOON">
              <inline-svg :src="require('@/assets/tool-icons/marketplace.svg')" />
              <label>Marketplace</label>
            </li>
            <li class="COMING-SOON">
              <inline-svg :src="require('@/assets/tool-icons/pipeline.svg')" />
              <label>Pipeline</label>
            </li>
          </ul>
        </div>

        <div class="VERTICAL-LINE"></div>

        <div class="w-1/3">
          <header>
            TOOLS FOR A GLOBAL<br />
            DATA ECONOMY
          </header>
          <ul>
            <li class="COMING-SOON">
              <inline-svg :src="require('@/assets/tool-icons/argon.svg')" />
              <label>Argon Stablecoin</label>
            </li>
            <li class="COMING-SOON">
              <inline-svg :src="require('@/assets/tool-icons/sidechain.svg')" />
              <label>Federated Sidechains</label>
            </li>
            <li class="COMING-SOON">
              <inline-svg :src="require('@/assets/tool-icons/bonds.svg')" />
              <label>Stabilization Bonds</label>
            </li>
            <li class="COMING-SOON">
              <inline-svg :src="require('@/assets/tool-icons/mining.svg')" />
              <label>Mining Operations</label>
            </li>
            <li class="COMING-SOON">
              <inline-svg :src="require('@/assets/tool-icons/nfts.svg')" />
              <label>Revenue Generating NFTs</label>
            </li>
            <li class="COMING-SOON">
              <inline-svg :src="require('@/assets/tool-icons/services.svg')" />
              <label>External Services</label>
            </li>
          </ul>
        </div>
      </section>

      <div class="HORIZONTAL-LINE my-6"></div>

      <section class="mb-16 mt-10">
        <div class="font-bold whitespace-nowrap text-center">
          ULIXEE DESKTOP
        </div>
        <div class="font-extralight whitespace-nowrap text-center text-5xl mt-2">
          The Easiest Way to Get Started
        </div>
        <p class="mt-3 text-center font-light">Download the latest version of <router-link to="/developer-environment">Developer Desktop, our all-in-one development environment</router-link> that makes it a breeze to get started. </p>
        <div class="flex flex-row space-x-6 mt-10">
          <button class="DESKTOP-BUTTON">
            <inline-svg :src="require('@/assets/footer-icons/mac.svg')" height="25" class="inline-block relative -top-[2px]" />
            Ulixee for Mac OS
          </button>
          <button class="DESKTOP-BUTTON">
            <inline-svg :src="require('@/assets/footer-icons/windows.svg')" height="25" class="inline-block mr-1" />
            Ulixee for Windows
          </button>
          <button class="DESKTOP-BUTTON">
            <inline-svg :src="require('@/assets/footer-icons/linux.svg')" height="25" class="inline-block relative -top-[1px]" />
            Ulixee for Linux
          </button>
        </div>
      </section>
    </div> -->

    <!-- <section class="bg-[#E0E6EA] items-end shadow shadow-inner border-t border-b border-[#B0A9B1]">
      <div class="mt-10 mb-7 pl-5 max-w-6xl mx-auto">
        <header class="font-bold text-xl  mb-2">We Believe the Web Must Be Open and Accessible</header>
        <p class="font-extralight mb-2">We're the creators and maintainers of <router-link to="/unblocked">Unblocked</router-link>, a suite of tools for evading and destroying the world's bot blockers.</p>
        <ul class="font-extralight grid grid-cols-3 mt-5 text-[#FBCBFF]">
          <li class="h-10">
            <a href="https://github.com/ulixee/unblocked/main/tree/agent">Unblocked Agent</a>
          </li>
          <li class="h-10">
            <a href="https://github.com/ulixee/unblocked/main/tree/double-agent">Double Agent</a>
          </li>
          <li class="h-10">
            <a href="https://github.com/ulixee/browser-profiler-data">Browser Vault</a>
          </li>
          <li class="h-10">
            <a href="https://github.com/ulixee/unblocked/main/tree/plugins">Unblocked Plugins</a>
          </li>
          <li class="h-10">
            <a href="https://github.com/ulixee/unblocked">Mission Impossible</a>
          </li>
          <li class="h-10">
            <router-link to="/unblocked">And More...</router-link>
          </li>
        </ul>
      </div>
    </section> -->
    <div class="font-light py-3 px-5 text-gray-600 opacity-50 text-sm flex flex-row w-full">
      <div>
        An open source project by
        <a href="https://github.com/calebjclark">@calebjclark</a> and
        <a href="https://github.com/blakebyrnes">@blakebyrnes</a>
      </div>
      <div class="hidden md:block text-right flex-1">
        Because knowledge deserves to be free.
      </div>
    </div>
  </footer>
</template>

<script lang="ts">
import * as Vue from "vue";
import { ChevronDoubleRightIcon } from '@heroicons/vue/24/solid';

export default Vue.defineComponent({
  components: {
    ChevronDoubleRightIcon,
  }
});
</script>

<style lang="scss">
$lineColor: #c2c9d9;
$lineShadowColor: white;
$linkColor: #921EA0;

.FOOTER {
  .HORIZONTAL-LINE {
    border-top: 1px solid $lineColor;
    box-shadow: 0 1px 0 $lineShadowColor;
  }

  .VERTICAL-LINE {
    border-left: 1px solid $lineColor;
    box-shadow: 1px 0 0 $lineShadowColor;
  }

  .SITEMAP {
    header {
      border-bottom: 1px solid $lineColor;
      box-shadow: 0 1px 0 $lineShadowColor;
      @apply font-bold pb-5;
    }

    label {
      color: $linkColor;
    }
    ul {
      @apply my-3;
    }

    li {
      @apply my-5 pb-5 font-extralight;
      border-bottom: 1px solid $lineColor;
      box-shadow: 0 1px 0 $lineShadowColor;
      svg {
        width: 20px;
        margin-right: 5px;
        display: inline-block;
        path {
          fill: $linkColor;
        }
      }
    }
  }

  a {
    color: $linkColor;
  }

  svg {
    fill: black;
  }

  .COMING-SOON {
    @apply opacity-50;
    label {
      @apply text-slate-500;
    }
    li svg {
      fill: black;
    }
    label:after {
      content: 'Coming Soon';
      @apply font-light uppercase text-xs border border-[#b6b4b6] rounded-lg px-2 ml-2;
    }
  }

  .DESKTOP-BUTTON {
    @apply text-white rounded border border-[#7f5085]  w-1/3 py-4 font-bold text-lg;
    background: rgb(189, 126, 198);
    box-shadow: inset 1px 1px 0 rgba(255,255,255,0.4);
  }
}
</style>
