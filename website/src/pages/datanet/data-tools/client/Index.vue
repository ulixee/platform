<template>
  <MainLayout class="ChromeAlive" :showPadding="false">
    <AboveTheFold>
      <MainHeader productKey="chromealive">CHROME ALIVE</MainHeader>
      <SubHeader>
        The Interactive Developer Tool That<br />
        Makes Writing Scraper Scripts Pure Joy
      </SubHeader>

      <p class="w-10/12">
        As anyone who has written scraper scripts knows, debugging can be one helluva experience, and not in a good way. One
        moment your script works and the next moment it's broken. Why? What changed? What did the website look like the
        precise moment your script broke? What about five milliseconds before? ChromeAlive connects your script to the
        website in a way that will forever change how scrapers are written.
      </p>

      <ActionButtons productKey="chromealive" />

      <ChromeAlivePreview class="mt-16" />
    </AboveTheFold>

    <h2 class="font-light text-3xl px-24 mt-16">TIMETRAVEL IS NOW POSSIBLE</h2>
    <div class="flex flex-row px-24 mb-12 items-stretch">
      <div class="w-24">
        <div v-for="(_, i) of 10" class="border-b border-gray-300 h-[10%]">
          {{i ? `${i}s ago` : 'now'}}
        </div>
      </div>
      <div class="flex-1 my-10">
        <section>
          <h3 class="font-bold text-2xl">Pause at Any Moment Of Script Execution</h3>
          <p>Set breakpoints in your code to freeze both your script and Chrome. This makes it easy to investigate the current webpage context  — javascript, DOM, storage, etc — and decide how to best proceed.</p>
        </section>

        <section class="mt-16">
          <h3 class="font-bold text-2xl">Travel Back In Time to See What Happened</h3>
          <p>It can be difficult to know why a scraper broke. What happened 10 milliseconds before? ChromeAlive’s playbar allows to drag back in time and see every step of the journey.</p>
        </section>

        <section class="mt-16">
          <h3 class="font-bold text-2xl">Use Time Ranges to Investigate DOM Changes Between Any Two Moments</h3>
          <p>It can be difficult to know why a scraper broke. What happened 10 milliseconds before? ChromeAlive’s playbar allows to drag back in time and see every step of the journey.</p>
        </section>
      </div>
    </div>

    <div class="py-12 px-24 border-t border-b border-gray-300">
      <h2 class="font-light text-3xl">TEAMWORK IS BEAUTIFUL</h2>
      <div class="flex flex-row">
        <span>Hero</span>
        <HeartIcon class="h-10" />
        <span>Chrome</span>
        <HeartIcon class="h-10" />
        <span>Devtools</span>
      </div>
      <section>
        <h3 class="font-bold text-2xl">Navigate the Browser Directly from Your Code</h3>
      </section>

       <section>
        <h3 class="font-bold text-2xl">Instantly Generate Unique DOM Selectors </h3>
      </section>

      <section>
        <h3 class="font-bold text-2xl">Search Across DOM Elements and Resource Bodies With a Single Button</h3>
      </section>
    </div>

    <section class="py-12 px-24">
      <h2 class="font-light text-3xl">EXTRACTION NEVER STOPS</h2>
      <p>ChromeAlive makes it easier to decouple your DOM extraction code from your web navigation code. Now you can iterate and rerun your extraction functions without needing to continue rerunning the website. It sounds like a small feature, but it’s a game changer.</p>
    </section>
    <div class="h-32"></div>
  </MainLayout>
</template>

<script lang="ts">
import * as Vue from "vue";
import { HeartIcon } from '@heroicons/vue/24/solid';
import InstallIt from '@/components/InstallIt.vue';
import Dependencies from '@/components/Dependencies.vue';
import UseIt from '@/components/UseIt.vue';
import Command from '@/components/Command.vue';
import { AboveTheFold, MainHeader, SubHeader, ActionButtons } from "../components";
import ChromeAlivePreview from "../components/ChromeAlivePreview.vue";

export default Vue.defineComponent({
  components: {
    HeartIcon,
    InstallIt,
    Dependencies,
    UseIt,
    Command,
    MainHeader,
    SubHeader,
    AboveTheFold,
    ActionButtons,
    ChromeAlivePreview
}
});
</script>
