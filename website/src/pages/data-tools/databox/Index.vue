<template>
  <MainLayout class="ChromeAlive" :showPadding="false">
    <AboveTheFold>
      <MainHeader productKey="databox">
        Ulixee Databox
      </MainHeader>
      
      <SubHeader>
        Package Your Data Scripts As Discrete<br />
        Composable Units Ready for Deployment
      </SubHeader>

      <p class="w-10/12">Databox is a specialized container that packages and runs your scraper scripts. It gives your scripts a uniform input and output interface, and it return uniform results across any cloud.</p>

      <ActionButtons productKey="databox" />
      <div class="pt-40 pb-16">
        <img src="/illustrations/overview-databox.png" class="w-60 m-auto" />
      </div>
    </AboveTheFold>

    <div class="px-24 mb-40">
      <section class="mt-24">
        <h3>Discrete & Composable</h3>
        <p>At the core, Databoxes are incredibly simple. It’s just a basic protocol to ensure your script is self-contained and stateless. The idea is that scraper scripts should be deployable as discrete components, each of which can then be built, scaled, and maintained independently. The biggest thing about Databxoes is that it ensourages you to design scraper architecure that scales horizontally.</p>      
      </section>

      <section class="mt-24">
        <h3>1,000 Production Simulations</h3>
        <p>The composability of Databoxes make them easy to test for production. Run 1,000 times on various IPs and input variables in order to trigger failures before pushing to production.</p>
      </section>

      <section class="mt-24">
        <h3>Intelligent Handling of Failure</h3>
        <p>The more you run scrapers, the more likely you are to find failures, Databoxes make it easy to categorize the outcomes intelligently. You can setup rules that allow Server Overlaod failures to be retried in x mnutes while Recaptchas should be retried only on a new IP Address.</p>
      </section>

      <section class="mt-24">
        <h3>Payment Walls</h3>
        <p>Databox was designed with payments as a first class concept.  It’s as simple as setting a price and wallet address in the configuration settings of your Databox. That’s it, so long as you’re using Ulixee Server you can open it to the public, and anyone can query it. Every time they do, you get paid.</p>
      </section>

      <section class="mt-24">
        <h3>Your Choice of Implementation</h3>
        <p>
          At it’s core, Databox is simply a specification for structuring data scripts so they’re composable and queryable within a broader network of scripts. Ulixee will officially support three implementations, but of course, anyone is welcome to release their own implementations for other tools.
        </p>
        <ul class="grid grid-cols-3">
          <li>
            <header>Databox for Hero</header>
            <p>This is the most powerful of all the Databox implementations. Wrap your Hero script within a single Databox function and watch it bring the rest of Ulixee’s tools alive.</p>
          </li>
          <li>
            <header>Databox for Puppeteer</header>
            <p>Databox for Puppeteer is an easy way to connect existing Puppeteer scrapers into the Ulixee platform. It allows them to run on Ulixee Server and accept payments in the new economy.</p>
          </li>
          <li>
            <header>Databox for Playwright</header>
            <p>Similar to the Puppeteer implementation, this is an easy way to connect existing Playwright scrapers into Ulixee’s platform. It allows your scripts to run on Ulixee Server and begin accepting payments</p>
          </li>
        </ul>
      </section>
    </div>
  </MainLayout>
</template>

<script lang="ts">
import * as Vue from "vue";
import InstallIt from '@/components/InstallIt.vue';
import Dependencies from '@/components/Dependencies.vue';
import UseIt from '@/components/UseIt.vue';
import Command from '@/components/Command.vue';
import { AboveTheFold, MainHeader, SubHeader, ActionButtons } from "../components";

export default Vue.defineComponent({
  components: {
    InstallIt,
    Dependencies,
    UseIt,
    Command,
    MainHeader,
    SubHeader,
    AboveTheFold,
    ActionButtons,
  }
});
</script>