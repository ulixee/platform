<template>
  <MainLayout class="GettingStarted" :showPadding="false" :isFixed="false">
    <div class="text-white" style="background: linear-gradient(to bottom, #780F85, #A428B3)">
      <div class="min-h-screen flex flex-col items-stretch">
        <div class="p-10 flex flex-col items-center">
          <div>
            <h1 class="w-3/12 mt-3">
              <svg class="font-extralight w-full" viewBox="0 0 131 13">
                <text x="0" y="12" style="fill: white">GETTING STARTED</text>
              </svg>
            </h1>
            <h2 class="font-extrabold w-10/12 mt-3 border-t border-b border-fuchsia-400">
              <svg class="w-full" viewBox="0 0 130 13">
                <text x="0" y="12" style="fill: white">The Simple Guide</text>
              </svg>
              <svg class="w-full" viewBox="0 0 135 15">
                <text x="0" y="12" style="fill: white">To Learning Ulixee</text>
              </svg>
            </h2>
          </div>
          <p class="text-left mt-24 w-5/12 text-xl font-light opacity-90 leading-relaxed">
            This tutorial introduces the four horsemen of Ulixee -- Hero, ChromeAlive, Databox and Stream. We'll give
            you easy <em>copy-and-paste</em> code at every step along the journey.
          </p>
        </div>

        <div class="text-center flex-1 flex flex-row items-center px-2">
          <div class="text-center w-full z-50" :class="[isFixed ? 'fixed top-0 left-0 bg-[#780F85]' : '']">
            <!-- <div :class="[isFixed ? '' : 'border-t mt-16']" class="flex flex-row text-center py-5 divide-x divide-fuchsia-400 border-b border-fuchsia-400">
              <div :class="[selectedSection===1 ? '' : 'opacity-50']" class="w-1/5">
                <svg class="font-extrabold w-6/12 mx-auto" viewBox="0 0 45 13">
                  <text x="50%" style="fill: white; text-anchor: middle;" y="12">1</text>
                </svg>
              </div>
              <div :class="[selectedSection===2 ? '' : 'opacity-50']" class="w-1/5">
                <svg class="font-extrabold w-6/12 mx-auto" viewBox="0 0 45 13">
                  <text x="50%" style="fill: white; text-anchor: middle;" y="12">2</text>
                </svg>
              </div>
              <div :class="[selectedSection===3 ? '' : 'opacity-50']" class="w-1/5">
                <svg class="font-extrabold w-6/12 mx-auto" viewBox="0 0 45 13">
                  <text x="50%" style="fill: white; text-anchor: middle;" y="12">3</text>
                </svg>
              </div>
              <div :class="[selectedSection===4 ? '' : 'opacity-50']" class="w-1/5">
                <svg class="font-extrabold w-6/12 mx-auto" viewBox="0 0 45 13">
                  <text x="50%" style="fill: white; text-anchor: middle;" y="12">4</text>
                </svg>
              </div>
              <div :class="[selectedSection===5 ? '' : 'opacity-50']" class="w-1/5">
                <svg class="font-extrabold w-6/12 mx-auto" viewBox="0 0 45 13">
                  <text x="50%" style="fill: white; text-anchor: middle;" y="12">5</text>
                </svg>
              </div>
            </div> -->
            <div v-if="!isFixed" class="mt-3 opacity-50 font-light">Scroll Down</div>
            <ChevronDownIcon v-if="!isFixed" class="h-12 stroke-1 inline-block opacity-50 -mt-3" />
          </div>
        </div>
      </div>

      <section class="h-screen px-24" ref="section1">
        <header class="text-3xl relative">
          <div class="border border-white rounded-full absolute bottom-[200%] left-0 w-10 h-10 text-center">A</div>
          Setup Your Project
        </header>
        <p>Creating a Ulixee project is the same as any other Node project — make the directory, initialize npm and install your depdencies.</p>

        <label>Run These Commands:</label>
        <Prism language="shell" :useUlixeeTheme="false">
          mkdir everyone-needs-a-hero
          cd everyone-needs-a-hero
          npm init
        </Prism>

        <div class="mt-5">
          <div class="text-3xl">Oh, and One More Thing</div>
          <p>If you haven't installed <router-link to="developer-desktop">Ulixee Developer Desktop</router-link> then you'll need to manually setup Miner:</p>

          <Prism language="shell" :useUlixeeTheme="false">
            npm install @ulixee/miner
          </Prism>
        </div>
      </section>

      <section class="h-screen px-24" ref="section1">
        <header class="text-3xl relative">
          <div class="border border-white rounded-full absolute bottom-[200%] left-0 w-10 h-10 text-center">B</div>
          Add Hero to Package.json
        </header>

        <Prism language="shell" :useUlixeeTheme="false" class="w-6/12">
          npm install @ulixee/hero
        </Prism>
      </section>

      <section class="h-screen pl-24" ref="section2">
        <header class="text-3xl relative">
          <div class="border border-white rounded-full absolute bottom-[200%] left-0 w-10 h-10 text-center">C</div>
          Write Your First Hero Script
        </header>
        <p class="mt-10">Create a file in your project called example.js and add the following code:</p>
        <Prism language="javascript" :useUlixeeTheme="false" class="w-6/12">
          import Hero from '@ulixee/hero';

          async function extractor(url) {
            const hero = new Hero();
            await hero.goto(url);
            const title = await hero.querySelector('title');
            return {
              title,
            }
          }

          extractor('https://ulixee.org/getting-started/hero').then(output => {
            // do something with output
          });
        </Prism>

        <p>The really cool thing about Hero scripts is you can use the full expressiveness of the DOM without creating
          function callbacks that run in another browser context. This means no more context switches. Write your scripts as if they were running in-browser.</p>
      </section>

      <section class="h-screen px-24"  ref="section3">
        <header class="text-3xl">Turn On ChromeAlive</header>

        <Prism language="shell" :useUlixeeTheme="false">
          npm install @ulixee/chromealive
        </Prism>

        <Prism language="javascript" :useUlixeeTheme="false">
          import Hero from '@ulixee/hero';

          async function extractor(url) {
            const hero = new Hero({ showChromeAlive: true });
            await hero.goto(url);
            const title = await hero.querySelector('title');
            return {
              title,
            }
          }

          extractor('https://ulixee.org/getting-started/hero').then(output => {
            // do something with output
          });
        </Prism>
      </section>

      <section class="h-screen px-24"  ref="section4">
        <header class="text-3xl">Simplify With a Databox</header>
        <Prism language="javascript" :useUlixeeTheme="false">
          import DataboxForHero from '@ulixee/databoxx';

          export default new DataboxForHero(async { hero } => {
          &nbsp; const hero = new Hero();
          &nbsp; await hero.goto('https://ulixee.org/getting-started/hero');
          })();
        </Prism>
      </section>

      <section class="h-screen px-24"  ref="section5">
        <header class="text-3xl">Query Your Databox with Stream</header>
        <Prism language="javascript" :useUlixeeTheme="false">
          import Stream from '@ulixee/stream';

          const stream = new Stream('databox-example.js');
        </Prism>
      </section>

      <section class="h-screen px-24"  ref="section6">
        <header class="text-3xl">And That's Only the Start</header>
        <p>Coming soon...</p>
        <ul>
          <li>Attach payment to your databox</li>
          <li>Package and deploy your databox to multiple clouds</li>
        </ul>
      </section>
    </div>
  </MainLayout>
</template>

<script lang="ts">
import * as Vue from "vue";
import Prism from "@/components/Prism.vue";
import { ChevronDownIcon } from '@heroicons/vue/outline'

export default Vue.defineComponent({
  components: {
    Prism,
    ChevronDownIcon,
  },
  setup() {
    return {
      isFixed: false,
      observer: Vue.ref<IntersectionObserver>(),
      selectedSection: Vue.ref(0),
      section1: Vue.ref<Element>(),
      section2: Vue.ref<Element>(),
      section3: Vue.ref<Element>(),
      section4: Vue.ref<Element>(),
      section5: Vue.ref<Element>(),
      section6: Vue.ref<Element>(),
    }
  },
  created() {
    this.observer = new IntersectionObserver(
      this.onSectionObserved,
      {
        root: window.document,
        threshold: 0,
      }
    );
  },
  mounted() {
    this.observer?.observe(this.section1 as Element);
    this.observer?.observe(this.section2 as Element);
    this.observer?.observe(this.section3 as Element);
    this.observer?.observe(this.section4 as Element);
    this.observer?.observe(this.section5 as Element);
    this.observer?.observe(this.section6 as Element);
  },
  methods: {
    onSectionObserved(entries: IntersectionObserverEntry[]) {
      let hasIntersection = false;
      entries.forEach(async (entry: any) => {
        const { target, isIntersecting} = entry;
        if (!isIntersecting) return;

        if (target === this.section1) {
          this.selectedSection = 1;
          hasIntersection = true;
        } else if (target === this.section2) {
          this.selectedSection = 2;
          hasIntersection = true;
        } else if (target === this.section3) {
          this.selectedSection = 3;
          hasIntersection = true;
        } else if (target === this.section4) {
          this.selectedSection = 4;
          hasIntersection = true;
        } else if (target === this.section5) {
          this.selectedSection = 5;
          hasIntersection = true;
        } else if (target === this.section6) {
          this.selectedSection = 6;
          hasIntersection = true;
        }
      });
      if (hasIntersection) {
        // this.isFixed = true;
      } else {
        this.isFixed = false;
        this.selectedSection = 0;
      }
    },
  }
});
</script>

<style lang="scss" scoped>
  section {
    @apply my-5;
    header {
      @apply font-bold;
    }
  }
  code {
    @apply block bg-slate-200 rounded;
  }
</style>
