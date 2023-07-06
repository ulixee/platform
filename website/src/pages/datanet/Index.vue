<template>
  <div class="DatanetIndex">
    <AboveTheFold />
    <div class="color-strip">
      <ul class="grid grid-cols-1 md:grid-cols-3 bg-[#5D1166] text-white px-5 md:px-36 pt-16 pb-16 md:pb-28 gap-y-10 md:gap-x-20 text-center">
        <li>
          <inline-svg :src="require('@/assets/homepage-icons/reliable.svg')" height="36" class="inline-block mb-2" />
          <header class="font-extrabold text-xl my-1">RELIABLE<br /> WEB EXTRACTION</header>
          <p class="opacity-70 font-light">Ulixee makes scrapers easier to write, faster to troubleshoot, and more reliable in production.</p>
        </li>

        <li>
          <inline-svg :src="require('@/assets/homepage-icons/scalable.svg')" height="36" class="inline-block mb-2" />
          <header class="font-extrabold text-xl my-1">INNOVATIVE <br />GIT-STYLE CLONING</header>
          <p class="opacity-70 font-light">Scaling from one to a thousand scrapers is easy with Ulixee’s public and private clouds.</p>
        </li>

        <li>
          <inline-svg :src="require('@/assets/homepage-icons/monetizable.svg')" height="36" class="inline-block mb-2" />
          <header class="font-extrabold text-xl my-1">INSTANT<br /> MONETIZATION</header>
          <p class="opacity-70 font-light">Ulixee's decentralized micro-payments convert your scripts into long-term revenue streams.</p>
        </li>
      </ul>
    </div>

    <div class="below-the-fold min-h-[600px] -mt-16 relative z-10" style="text-shadow: 1px 1px 0 white">
      <div class="BOX my-3">
        <div>
          <inline-svg :src="require('@/assets/tool-icons/hero.svg')" height="40" />
        </div>
        <h2>ULIXEE HERO</h2>
        <h3>The Programatic Web Browser <br />Built for Easy and Reliable Scraping</h3>
        <p class="px-64">Hero was built from the ground up as a modern web scraping engine, not a tool for automated testing like
          Puppeteer and Playwright. It has native support for reactive handling of curveballs that a website might throw at you,
          such as cookie overlays and captchas. Give it a spin; you'll never want to go back to the old tools.</p>
        <ul class="mx-1">
<!--          <li><router-link to="/hero">Learn More</router-link></li>-->
          <li><router-link to="/documentation/hero">Go to Documentation</router-link></li>
        </ul>
      </div>

      <div class="BOX my-6">
        <div>
          <inline-svg :src="require('@/assets/tool-icons/datastore.svg')" height="40" />
        </div>
        <h2>ULIXEE DATASTORES</h2>
        <h3>A SQL Database with Scraper Hooks,<br /> Native Paywalls and Git-style Cloning</h3>
        <p class="px-64">
          Datastore is a new type of distributed database. It transforms traditional web-scraper scripts into full-blown SQL functions and tables. It also includes built-in native payments, which opens a world of new product possibilities.</p>
        <ul class="mx-1">
<!--          <li><router-link to="/desktop">Learn More</router-link></li>-->
          <li><router-link to="/documentation/datastore">Go to Documentation</router-link></li>
        </ul>
      </div>

      <div class="flex flex-row my-3 items-stretch mx-32 mb-6">
        <div class="BOX !mx-0 !mr-3 w-1/2">
          <div>
            <inline-svg :src="require('@/assets/tool-icons/client.svg')" height="40" />
          </div>
          <h2>ULIXEE CLIENT</h2>
          <h3>Query any Public or Private<br /> Dataset with SQL or NoSQL.</h3>
          <p class="px-20">The official Client library for Ulixee. Import it into your codebase to query any Datastore from both public and private clouds.</p>
          <ul class="mx-1">
<!--            <li><router-link to="/datastore">Learn More</router-link></li>-->
            <li><router-link to="/documentation/client">Go to Documentation</router-link></li>
          </ul>
        </div>
        <div class="BOX !mx-0 !ml-3 w-1/2 relative pointer-events-none">
          <inline-svg :src="require('@/assets/tool-icons/coming-soon.svg')" height="200" class='absolute top-[-2px] right-[-4px]' />
          <div class=' opacity-50'>
            <inline-svg :src="require('@/assets/tool-icons/stream.svg')" height="40" />
          </div>
          <h2 class=' opacity-50'>ULIXEE STREAM</h2>
          <h3 class=' opacity-50'>
            Pipe and Transform Data<br /> Across Datastores
          </h3>
          <p class="px-20 opacity-50">This library extends the Ulixee Client, making it easy to chain together multiple Datastores to mashup entirely new datasets</p>
          <ul class="mx-1">
<!--            <li><router-link to="/cloud">Learn More</router-link></li>-->
            <li>
              <router-link to="/documentation/stream" class='opacity-50'>Go to Documentation</router-link>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <section class='bg-[#5D1166] min-h-[1000px] -mt-12 px-32 pt-40 text-center text-white relative'>
        <h2 class='text-8xl font-bold tracking-widest'>ULIXEE DESKTOP</h2>
        <h3 class='uppercase font-light text-[3.3rem]'>The Easiest Way to Start Building</h3>
        <p class='font-light mt-5 w-7/12 m-auto'>Ulixee Desktop has all the tooling you need to create Datastores, deploy to the Cloud and start earning money. It comes packaged with our simple CLI as well as our beautiful UI for easily creating, managing and debugging your Datastores.</p>
        <div class='WINDOW'>
          <div class='RED DOT'></div>
          <div class='YELLOW DOT'></div>
          <div class='GREEN DOT'></div>
        </div>
        <inline-svg :src="require('@/assets/homepage-icons/clouds.svg')" class="absolute bottom-[-2px] left-0 w-full" />
      </section>

      <section class="CLOUD text-center pt-10 relative pb-40">
        <h2 class="text-fuchsia-700 text-8xl font-bold tracking-widest mt-1">
          ULIXEE CLOUD
        </h2>
        <h3 class='text-fuchsia-700 text-5xl mx-auto w-7/12 mt-5 leading-tight'>THE DECENTRALIZED MARKETPLACE AND COMPUTE ENGINE FOR DATASTORES</h3>
        <p class="font-light w-6/12 mx-auto text-left mt-6">
          Ulixee Cloud is a massively scalable decentralized network. It allows you to deploy your Datastore with a single click, and it gives you full control every step of the process. Everyone in the Ulixee community will be able to participate in the management and earnings of this cloud.
        </p>
        <div class='text-center flex flex-row space-x-2 items-center justify-center mt-10'>
<!--          <button class='py-2 px-20 border border-slate-300 rounded'>Learn More</button>-->
          <button class='py-2 px-40 border border-slate-300 rounded'>Open Documentation</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from "vue";
import AboveTheFold from './components/AboveTheFold.vue';

export default Vue.defineComponent({
  components: {
    AboveTheFold,
  },
});
</script>

<style lang="scss">
.DatanetIndex {
  .BOX {
    border: 1px solid rgba(0,0,0,0.2);
    background: #F2F4F5;
    box-shadow: 1px 1px 2px rgba(0,0,0,0.15);
    @apply rounded border text-center pt-16 font-light mx-32 flex flex-col justify-center content-start;

    svg {
      @apply inline mb-3;
    }

    h2 {
      @apply font-bold tracking-widest text-3xl text-[#A716B9] mb-3;
    }

    h3 {
      @apply text-4xl font-extralight mb-8 leading-[3rem];
    }

    p {
      @apply leading-7 text-xl font-extralight text-justify;
    }

    a {
      text-decoration: none;
    }

    ul {
      padding: 20px;
      border-top: 1px solid rgba(0,0,0,0.1);
      @apply mt-10 flex flex-row space-x-20 justify-center text-lg;
    }
  }

  .WINDOW {
    @apply w-8/12 h-[400px] rounded-t-lg m-auto mt-12 relative;
    background: linear-gradient(to bottom, rgba(71, 12, 78, 1) 60%, rgba(71, 12, 78, 0) 100%);
    border: 1px solid rgba(0,0,0,0.4);
    box-shadow: inset 1px 1px 0 rgba(255,255,255,0.15), 1px 1px 2px rgba(0,0,0,0.1);
    .DOT {
      @apply w-3 h-3 rounded-full absolute;
      &.RED {
        @apply bg-red-500 left-2 top-2;
      }
      &.YELLOW {
        @apply bg-yellow-500 left-7 top-2;
      }
      &.GREEN {
        @apply bg-green-500 left-12 top-2;
      }
    }
  }

  section.CLOUD {
    background: linear-gradient(to bottom, rgb(250, 252, 253), rgb(242, 244, 245));
  }
}
</style>
