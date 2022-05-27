<template>
  <MainLayout class="HOME-LAYOUT" :showPadding="false">
    <div class="ABOVE-THE-FOLD relative text-white pl-5 md:pl-12 lg:pl-20 py-24 flex items-center">
      <div class="BLOCKS absolute pl-5 md:pl-0 w-full md:w-8/12 h-full top-0 right-0 z-10 overflow-hidden">
        <div class="BLOCK-ROW">
          <div v-for="i of rows[0]" class="BLOCK">
            <inline-svg :src="getLogo(0, i)" />
          </div>
        </div>
        <div class="BLOCK-ROW">
          <div class="spacer min-w-[120px]"></div>
          <div v-for="i in rows[1]" class="BLOCK">
            <inline-svg :src="getLogo(1, i)" />
          </div>
        </div>
        <div class="BLOCK-ROW">
          <div class="spacer min-w-[240px]"></div>
          <div v-for="i in rows[2]" class="BLOCK">
            <inline-svg :src="getLogo(2, i)" />
          </div>
        </div>
        <div class="BLOCK-ROW">
          <div class="spacer min-w-[300px]"></div>
          <div v-for="i in rows[3]" class="BLOCK">
            <inline-svg :src="getLogo(3, i)" />
          </div>
        </div>
        <div class="BLOCK-ROW">
          <div class="spacer min-w-[350px]"></div>
          <div v-for="i in rows[4]" class="BLOCK">
            <inline-svg :src="getLogo(4, i)" />
          </div>
        </div>
        <div class="BLOCK-ROW">
          <div class="spacer min-w-[300px]"></div>
          <div v-for="i in rows[5]" class="BLOCK">
            <inline-svg :src="getLogo(5, i)" />
          </div>
        </div>
        <div class="BLOCK-ROW">
          <div class="spacer min-w-[350px]"></div>
          <div v-for="i in rows[6]" class="BLOCK">
            <inline-svg :src="getLogo(6, i)" />
          </div>
        </div>
        <div class="BLOCK-ROW">
          <div class="spacer min-w-[280px]"></div>
          <div v-for="i in rows[7]" class="BLOCK">
            <inline-svg :src="getLogo(7, i)" />
          </div>
        </div>
        <div class="BLOCK-ROW">
          <div class="spacer min-w-[400px]"></div>
          <div v-for="i in rows[8]" class="BLOCK">
            <inline-svg :src="getLogo(8, i)" />
          </div>
        </div>
        <div class="BLOCK-ROW">
          <div class="spacer min-w-[300px]"></div>
          <div v-for="i in rows[9]" class="BLOCK">
            <inline-svg :src="getLogo(9, i)" />
          </div>
        </div>
        <div class="BLOCK-ROW">
          <div class="spacer min-w-[200px]"></div>
          <div v-for="i in rows[10]" class="BLOCK">
            <inline-svg :src="getLogo(10, i)" />
          </div>
        </div>
        <div class="BLOCK-ROW">
          <div class="spacer min-w-[100px]"></div>
          <div v-for="i in rows[11]" class="BLOCK">
            <inline-svg :src="getLogo(11, i)" />
          </div>
        </div>
        <div class="BLOCK-ROW lg:!hidden">
          <div class="spacer min-w-[50px]"></div>
          <div v-for="i in rows[12]" class="BLOCK">
            <inline-svg :src="getLogo(12, i)" />
          </div>
        </div>
      </div>
      <div>
        <h1 class="mb-6">
          <div class="font-bold text-xl md:text-3xl opacity-75">Ulixee 2.0</div>
          <div class="font-bold text-3xl md:text-6xl lg:text-7xl"><span class="md:block">THE OPEN DATA</span> PLATFORM</div>
        </h1>

        <p class="font-extralight w-7/12 md:w-5/12 text-md md:text-xl my-5">Ulixee is creating an ecosystem where every website is an API and every developer can innovate new ideas atop the world’s data.</p>

        <!-- <ul class="flex flex-row font-bold">
          <li>
            <Popover class="relative" v-slot="{ open }">
              <PopoverButton
                :class="[open ? 'text-purple-400' : 'text-white', 'font-light group inline-flex items-center decoration-purple-400']"
              >
                <span>Explore Our Tools</span>
                <ChevronDownIcon
                  :class="[open ? 'text-purple-400' : 'text-white', 'h-5 w-5 ']"
                  aria-hidden="true"
                />
              </PopoverButton>
              <ActiveToolsOverlay />
            </Popover>
          </li>
          <li class="font-light opacity-50 mx-5">or</li>
          <li>
            <router-link to="/getting-started" class="text-white decoration-purple-400">Get Started</router-link>
          </li>
        </ul> -->
      </div>
    </div>
    <div class="color-strip">
      <ul class="grid grid-cols-1 md:grid-cols-3 bg-[#5D1166] text-white px-5 md:px-24 pt-16 pb-16 md:pb-28 gap-y-10 md:gap-x-20 text-center">
        <li>
          <inline-svg :src="require('@/assets/homepage-icons/reliable.svg')" height="36" class="inline-block mb-2" />
          <header class="font-extrabold text-xl my-1">RELIABLE<br /> WEB EXTRACTION</header>
          <p class="opacity-70 font-light">Ulixee makes scrapers easier to write, faster to troubleshoot, and more reliable in production.</p>
        </li>

        <li>
          <inline-svg :src="require('@/assets/homepage-icons/monetizable.svg')" height="36" class="inline-block mb-2" />
          <header class="font-extrabold text-xl my-1">INSTANT<br /> MONETIZATION</header>
          <p class="opacity-70 font-light">Ulixee's decentralized micro-payments convert your scripts into long-term revenue streams.</p>
        </li>

        <li>
          <inline-svg :src="require('@/assets/homepage-icons/scalable.svg')" height="36" class="inline-block mb-2" />
          <header class="font-extrabold text-xl my-1">EFFORTLESS <br />PRODUCTION SCALING</header>
          <p class="opacity-70 font-light">Scaling from one to a thousand scrapers is easy with Ulixee’s public and private clouds.</p>
        </li>
      </ul>
    </div>
    <!-- <div class="below-the-fold min-h-[600px] -mt-16" style="text-shadow: 1px 1px 0 white">
      <div class="BOX my-3">
        <h2><inline-svg :src="require('@/assets/tool-icons/hero.svg')" height="30" />ULIXEE HERO</h2>
        <h3>The Programatic Web Browser <br />Built for Easy and Reliable Scraping</h3>
        <p class="px-64">Hero was built from the ground up as a modern web scraping engine, not a tool for automated testing like
          Puppeteer and Playwright. It has native support for reactive handling of curve balls that a website might throw at you,
          such as cookie overlays and captchas. Give it a spin; you'll never want to go back to the old tools.</p>
        <ul class="mx-1">
          <li><router-link to="/hero">Learn More</router-link></li>
          <li><a href="//docs.ulixee.org/hero">Go to Documentation</a></li>
        </ul>
      </div>

      <div class="BOX my-6">
        <h2><inline-svg :src="require('@/assets/tool-icons/chromealive.svg')" height="30" />CHROME ALIVE</h2>
        <h3>The Interactive Developer Tool<br /> That Makes Writing Scrapers Pure Joy</h3>
        <p class="px-64">
          As anyone who has written scraper scripts knows, debugging can be one helluva experience, and not in a good way.
          One moment your script works and the next moment it's broken. Why? What changed? What did 
          the website look like the precise moment your script broke? What about five milliseconds before? ChromeAlive connects
          your script to the website in a way that will forever change how scrapers are written.</p>
        <ul class="mx-1">
          <li><router-link to="/chromealive">Learn More</router-link></li>
          <li><a href="//docs.ulixee.org/chromealive">Go to Documentation</a></li>
        </ul>
      </div>

      <div class="flex flex-row my-3 items-stretch mx-20 mb-6">
        <div class="BOX !mx-0 !mr-3 w-1/2">
          <h2><inline-svg :src="require('@/assets/tool-icons/databox.svg')" height="30" />ULIXEE DATABOX</h2>
          <h3>Package Your Data Scripts<br />As Discrete, Composable Units</h3>
          <p class="px-20">Databoxe is like Docker but for scraper scripts. It gives your scripts a uniform input and output interface, and it return uniform results across any cloud.</p>
          <ul class="mx-1">
            <li><router-link to="/databox">Learn More</router-link></li>
            <li><a href="//docs.ulixee.org/databox">Go to Documentation</a></li>
          </ul>
        </div>
        <div class="BOX !mx-0 !ml-3 w-1/2">
          <h2><inline-svg :src="require('@/assets/tool-icons/server.svg')" height="30" />ULIXEE SERVER</h2>
          <h3>Easily Scale Your Databoxes<br /> Across Multiple Clouds</h3>
          <p class="px-20">Server is our answer to running your scripts in production, scaling horizontally and breaking free of any single cloud stack.</p>
          <ul class="mx-1">
            <li><router-link to="/server">Learn More</router-link></li>
            <li><a href="//docs.ulixee.org/server">Go to Documentation</a></li>
          </ul>
        </div>
      </div>

      <div class="BOX my-3">
        <h2><inline-svg :src="require('@/assets/tool-icons/stream.svg')" height="30" />ULIXEE STREAM</h2>
        <h3>
          Query and Transform Data Across<br />
          Many Different Sources and Formats
        </h3>
        <p class="px-52">
          Stream is a uniform library for querying and retrieving datasets across any scraper script wrapped in a Databox. You 
          can make a single query or large querysets in parallel. And you can pipe, transform, reduce and explode datasets from 
          the output of one Databox to the input of another.
          </p>
        <ul class="mx-1">
          <li><router-link to="/stream">Learn More</router-link></li>
          <li><a href="//docs.ulixee.org/hero">Go to Documentation</a></li>
        </ul>
      </div>

      <section class="text-center mt-36 relative pb-60">
        <div class="inline-block border border-slate-300 rounded-full font-light mx-auto px-6 py-1 text-slate-600">COMING SOON</div>
        <h1 class="text-fuchsia-700">
          <div class="text-3xl mt-3">THE DECENTRALIZED</div>
          <div class="text-8xl font-light mt-1">ULIXEE CLOUD</div>
        </h1>
        <p class="font-light w-7/12 mx-auto text-left mt-6">Ulixee Cloud is a massively scalable, decentralized, data query network. It’s meant to be the data layer of the internet, a protocol that turns every website into a REST API. Everyone in the Ulixee community will be able to participate in the management and earnings of this cloud.</p>
        <inline-svg :src="require('@/assets/homepage-icons/clouds.svg')" height="150" class="absolute bottom-0 left-0 w-full" />
      </section>

      <ul class="flex flex-row text-center space-x-32 pt-10 pb-20 px-20" style="background: linear-gradient(to bottom, #FAFCFD, #F2F4F5)">
        <li class="w-1/3">
          <inline-svg :src="require('@/assets/homepage-icons/open-source.svg')" height="36" class="inline-block mb-2" />
          <header class="font-bold">Open Sourced</header>
          <p class="font-light">Ulixee in a fully open source project. The entire platform is meant to be owned by the world.</p>
        </li>

        <li class="w-1/3">
          <inline-svg :src="require('@/assets/homepage-icons/modularized.svg')" height="36" class="inline-block mb-2" />
          <header class="font-bold">Modularized</header>
          <p class="font-light">We've designed Ulixee so that you can pick and choose the parts you want. No lock-in.</p>
        </li>

        <li class="w-1/3">
          <inline-svg :src="require('@/assets/homepage-icons/global.svg')" height="36" class="inline-block mb-2" />
          <header class="font-bold">Without Borders</header>
          <p class="font-light">Global permeates everything we do, including the payment mechanism used for transacting.</p>
        </li>
      </ul>
    </div>
    <div class="h-20"></div> -->
  </MainLayout>
</template>

<script lang="ts">
import * as Vue from "vue";
import { Popover, PopoverButton } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/solid'
import ActiveToolsOverlay from "@/components/ActiveToolsOverlay.vue";

const logos = [
  require('@/assets/homepage-logos/amazon.svg'),
  require('@/assets/homepage-logos/airbnb.svg'),
  require('@/assets/homepage-logos/alibaba.svg'),
  require('@/assets/homepage-logos/allrecipes.svg'),
  require('@/assets/homepage-logos/accuweather.svg'),
  require('@/assets/homepage-logos/autotrader.svg'),
  require('@/assets/homepage-logos/barnesnoble.svg'),
  require('@/assets/homepage-logos/bing.svg'),
  require('@/assets/homepage-logos/bloomberg.svg'),
  require('@/assets/homepage-logos/booking.svg'),
  require('@/assets/homepage-logos/buzzfeed.svg'),
  require('@/assets/homepage-logos/cbssports.svg'),
  require('@/assets/homepage-logos/cnn.svg'),
  require('@/assets/homepage-logos/craigslist.svg'),
  require('@/assets/homepage-logos/dribble.svg'),
  require('@/assets/homepage-logos/ebay.svg'),
  require('@/assets/homepage-logos/espn.svg'),
  require('@/assets/homepage-logos/etsy.svg'),
  require('@/assets/homepage-logos/eventbrite.svg'),
  require('@/assets/homepage-logos/expedia.svg'),
  require('@/assets/homepage-logos/facebook.svg'),
  require('@/assets/homepage-logos/fortune.svg'),
  require('@/assets/homepage-logos/glassdoor.svg'),
  require('@/assets/homepage-logos/google.svg'),
  require('@/assets/homepage-logos/hubspot.svg'),
  require('@/assets/homepage-logos/indeed.svg'),
  require('@/assets/homepage-logos/instagram.svg'),
  require('@/assets/homepage-logos/kayak.svg'),
  require('@/assets/homepage-logos/kickstarter.svg'),
  require('@/assets/homepage-logos/linkedin.svg'),
  require('@/assets/homepage-logos/medium.svg'),
  require('@/assets/homepage-logos/monster.svg'),
  require('@/assets/homepage-logos/motleyfool.svg'),
  require('@/assets/homepage-logos/nextdoor.svg'),
  require('@/assets/homepage-logos/indeed.svg'),
  require('@/assets/homepage-logos/priceline.svg'),
  require('@/assets/homepage-logos/quora.svg'),
  require('@/assets/homepage-logos/reddit.svg'),
  require('@/assets/homepage-logos/reuters.svg'),
  require('@/assets/homepage-logos/stackoverflow.svg'),
  require('@/assets/homepage-logos/ticketmaster.svg'),
  require('@/assets/homepage-logos/tumblr.svg'),
  require('@/assets/homepage-logos/twitter.svg'),
  require('@/assets/homepage-logos/upwork.svg'),
  require('@/assets/homepage-logos/walmart.svg'),
  require('@/assets/homepage-logos/wikipedia.svg'),
  require('@/assets/homepage-logos/yahoo.svg'),
  require('@/assets/homepage-logos/yelp.svg'),
  require('@/assets/homepage-logos/youtube.svg'),
  require('@/assets/homepage-logos/zillow.svg'),
  require('@/assets/homepage-logos/booking.svg'),
  require('@/assets/homepage-logos/allrecipes.svg'),
  require('@/assets/homepage-logos/linkedin.svg'),
]

const rows = [
  5,
  5,
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
    ActiveToolsOverlay
},
  setup() {
    return {
      logos,
      rows,
    }
  },
  methods: {
    getLogo(rowIndex: number, itemIndex: number) {
      let count = 0;
      for (let i = 0; i < rowIndex; i++) {
        if (i === rowIndex) break;
        count += rows[i];
      }
      return logos[count + itemIndex - 1];
    }
  }
});
</script>

<style lang="scss">
.HOME-LAYOUT {
  .ABOVE-THE-FOLD {
    min-height: calc(100vh - 3.25rem);
    background: linear-gradient(to bottom, #780F85, #A428B3);

    .BLOCKS {
      padding-top: 8px;
      padding-bottom: 8px;
    }
    .BLOCK-ROW {
      @apply flex flex-row h-[7.6923076923%] lg:h-[8.333333%] min-h-[45px];
      padding-bottom: 8px;
    }
    .BLOCK {
      height: 100%;
      background: #AB5BB5;
      box-shadow: 1px 1px 6px rgba(0,0,0,0.5);
      margin-right: 8px;
      text-align: center;
      @apply flex items-center px-5 min-w-[100px] md:min-w-[200px];
      &:hover {
        background: #bf6cca;
        svg {
          opacity: 0.7;
        }
      }
      svg {
        display: inline-block;
        pointer-events: none;
        height: 40%;
        margin: auto;
        opacity: 0.5;
        path {
          fill: white;
        }
      }
    }
  }

  .BOX {
    border: 1px solid rgba(0,0,0,0.2);
    background: #F2F4F5;
    box-shadow: 1px 1px 2px rgba(0,0,0,0.15);
    @apply rounded border text-center pt-16 font-light mx-20;

    svg {
      @apply inline mr-2;
    }

    h2 {
      @apply font-bold tracking-widest text-xl text-[#A716B9] mb-3;
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
}
</style>