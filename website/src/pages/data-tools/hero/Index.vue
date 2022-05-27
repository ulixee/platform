<template>
  <MainLayout class="ChromeAlive" :showPadding="false">
    
    <AboveTheFold>
      <MainHeader productKey="hero">Ulixee Hero</MainHeader>
      <SubHeader>
        The Programatic Web Browser<br />
        Built for Easy and Reliable Scraping
      </SubHeader>

      <p class="w-10/12">
        Hero was built from the ground up as a modern web scraping engine. Unlike Puppeteer and Playwright which were 
        designed for automated testing, Hero has native support for DOM APIs and reactive flow handling. This allows you to 
        easily handle website curveballs, such as cookie overlays and captchas. Give it a spin; you'll never want to go back 
        to the old tools again.
      </p>

      <ActionButtons productKey="hero" />
      <HeroPreview class="mt-16" />
    </AboveTheFold>

    <div class="py-10">
      <h2 class="font-normal text-center text-3xl text-slate-600">IT WORKS ALMOST EVERYWHERE</h2>
      <div class="flex flex-row justify-center my-10 opacity-50">
        <inline-svg :src="require('@/assets/homepage-logos/airbnb.svg')" height="25" class="inline-block" />
        <inline-svg :src="require('@/assets/homepage-logos/google.svg')" height="25" class="inline-block" />
        <inline-svg :src="require('@/assets/homepage-logos/kayak.svg')" height="25" class="inline-block" />
        <inline-svg :src="require('@/assets/homepage-logos/craigslist.svg')" height="25" class="inline-block" />
        <inline-svg :src="require('@/assets/homepage-logos/zillow.svg')" height="25" class="inline-block" />
        <inline-svg :src="require('@/assets/homepage-logos/twitter.svg')" height="25" class="inline-block" />
      </div>

      <h2 class="font-normal text-center text-3xl text-slate-500 py-5">WITH ENDLESS POSSIBILITIES</h2>
      <ul class="grid grid-cols-2">
        <li class="flex flex-row">
          <div class="border-2 border-green-500 items-center">
            <CheckIcon class="h-10" />
          </div>
          <div>
            Turn your website into an API endpoint
          </div>
        </li>
        <li>
          <div><CheckIcon class="h-10" /></div>
          Automate personal tasks online</li>
        <li>
          <div><CheckIcon class="h-10" /></div>
          Create new meta search engines</li>
        <li>
          <div><CheckIcon class="h-10" /></div>
          Innovate completely new business models</li>
      </ul>
    </div>

    <section class="border-t border-slate-300 pt-8 px-24 pb-20">
      <h2 class="font-light text-3xl">ACT LIKE A HUMAN</h2>
      <header>Avoid Bot Detection Along Your Entire Stack</header>
      <p>Today's bot blockers look at much more than just IP addresses. In fact, there are over 400,000 ways to detect an automated browser, from the javascript settings of your headless browser to the TCP configuration of your networking library. Ulixee Hero is a headless browser that's nearly impossible to detect. It does this by using SecretAgent under the hood, which avoids bot-blockers by emulating real human users.</p>
    </section>

    <div class="bg-white pl-24 py-20">
      <div class="flex flex-row">
        <div class="w-7/12">
          <h2 class="font-light text-3xl">CODE SMARTER NOT HARDER</h2>
          <section class="pt-5">
            <h3 class="font-bold text-2xl">Use Standard DOM APIs</h3>
            <p>We've recreated a fully compliant DOM directly in NodeJS allowing you bypass the headaches of previous scraper tools.

            SecretAgent lets you write data extraction scripts without learning an entirely new API. It uses the same DOM properties and methods implemented by modern web browsers — the only difference is you use await before each command. For example, here’s how you would </p>
          </section>

          <section class="pt-5">
            <h3 class="font-bold text-2xl">State Machine Solves the Nasty Load Event, And Much More</h3>
            <p>Most scraper tools presume that everything will happen in a precise order, which is untrue out in the wild. In practice, you end up checking for element states, sleeping, and checking again.</p>    
          </section>

          <section class="pt-5">
            <h3 class="font-bold text-2xl">Reactive Flow Handlers Roll With the Website Not Against It</h3>
            <p>States can also be used to define “callbacks” that should trigger when a state is detected. These are called Flow Handlers. They’re particularly useful for reacting to things like an “Accept Cookies” popup that could pop onto the page at any point. Once your callback is complete (Ie, you clicked the close button), your script will continue where it left off. Flow Handlers are automatically checked anytime an AwaitedDOM exception occurs (eg, element interaction fails, an element is not found, or a waitForState times-out).</p>
          </section>
        </div>
        <div class="w-5/12 relative">
          <div class="relative h-full w-full my-10 ml-10 bg-white border border-slate-300 rounded-sm shadow-lg"></div>
        </div>
      </div>
    </div>

    <section class="px-24 py-20">
      <h2 class="font-light text-3xl">CODE HOW YOU WANT</h2>
      <h3 class="font-bold text-3xl">Powerful Plugin Functionality</h3>
      <p>Hero was designed to be customized, modified and extended. It has full support for plugins, which can be as simple or as complicated as you need them to be.</p>
    </section>

    <section class="px-24 py-20">
      <h2 class="font-light text-3xl">USE THE RIGHT TOOL FOR THE JOB</h2>
      <h3 class="font-bold text-2xl">It's for Scraping, Not Automated Testing</h3>
      <p>We love Puppeteer and Playwright. They're fantastic at what they were designed for -- automated testing. But if you want a real scraping engine, Hero is what you want.</p>
      <table class="mt-10 mb-20 w-full">
        <thead>
          <tr class="border-b border-slate-400">
            <td></td>
            <td>Ulixee Hero</td>
            <td>Puppeteer</td>
            <td>Playwright</td>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-slate-300 h-10">
            <td>Designed to Avoid Bot Blockers</td>
            <td><CheckIcon class="h-5" /></td>
            <td><XIcon class="h-5" /></td>
            <td><XIcon class="h-5" /></td>
          </tr>
          <tr class="border-b border-slate-300 h-10">
            <td>Designed for Automated Testing</td>
            <td><XIcon class="h-5" /></td>
            <td><CheckIcon class="h-5" /></td>
            <td><CheckIcon class="h-5" /></td>
          </tr>
          <tr class="border-b border-slate-300 h-10">
            <td>Designed for Serious Web Scraping</td>
            <td><CheckIcon class="h-5" /></td>
            <td><XIcon class="h-5" /></td>
            <td><XIcon class="h-5" /></td>
          </tr>
          <tr class="border-b border-slate-300 h-10">
            <td>Supports Direct DOM Calls</td>
            <td><CheckIcon class="h-5" /></td>
            <td><XIcon class="h-5" /></td>
            <td><XIcon class="h-5" /></td>
          </tr>
          <tr class="border-b border-slate-300 h-10">
            <td>Native Support for Plugins</td>
            <td><CheckIcon class="h-5" /></td>
            <td><XIcon class="h-5" /></td>
            <td><XIcon class="h-5" /></td>
          </tr>
          <tr class="border-b border-slate-300 h-10">
            <td>Uses Reactive Flow Handlers</td>
            <td><CheckIcon class="h-5" /></td>
            <td><XIcon class="h-5" /></td>
            <td><XIcon class="h-5" /></td>
          </tr>
          <tr class="border-b border-slate-300 h-10">
            <td>Event Based State Tracking</td>
            <td><CheckIcon class="h-5" /></td>
            <td><XIcon class="h-5" /></td>
            <td><XIcon class="h-5" /></td>
          </tr>
        </tbody>
      </table>
    </section>
  </MainLayout>
</template>

<script lang="ts">
import * as Vue from "vue";
import InstallIt from '@/components/InstallIt.vue';
import Dependencies from '@/components/Dependencies.vue';
import UseIt from '@/components/UseIt.vue';
import Command from '@/components/Command.vue';
import { CheckIcon, XIcon } from '@heroicons/vue/solid';
import { AboveTheFold, MainHeader, SubHeader, ActionButtons } from "../components";
import HeroPreview from "../components/HeroPreview.vue";

export default Vue.defineComponent({
  components: {
    InstallIt,
    Dependencies,
    UseIt,
    Command,
    CheckIcon,
    XIcon,
    MainHeader,
    SubHeader,
    AboveTheFold,
    ActionButtons,
    HeroPreview,
  }
});
</script>
