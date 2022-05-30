<template>
  <MainLayout class="ChromeAlive" :showPadding="false">
    <AboveTheFold>
      <MainHeader productKey="server">Ulixee Server</MainHeader>
      <SubHeader>
        Easily Scale Data Extraction Across<br />
        Multiple Clouds and Environments
      </SubHeader>

      <p class="w-10/12">Ulixee Server is designed to easily run and scale your production scripts across one or more clouds. At their most basic level, they host and serve your databoxes. As we build out Ulixee's decentralized cloud, these Servers can be connected as miners in the broader data economy.</p>

      <ActionButtons productKey="server" />

      <img src="/illustrations/overview-server.png" class="w-8/12 m-auto my-20" />
    </AboveTheFold>

    <div class="mb-40 px-24">
      <section class="mt-20 w-6/12">
        <h3 class="font-light text-2xl">Install, Configure and Run Your Server With a Single Command</h3>
        <p>Any server with NodeJS v12.x or greater can  be fully setup and ready for production with a single command:</p>
      </section>

      <section class="mt-20 w-6/12 ml-auto">
        <h3 class="font-light text-2xl">Localhost is Production</h3>
        <p>It's frustrating when your code works locally but not in production, and you can’t figure out why. Ulixee Server power your local development with all the same options as production, which simplifies your go-to-market and your debugging.</p>
      </section>

      <section class="mt-20">
        <h3 class="font-light text-2xl">The Entire Platform Was Designed for Horizontal Scaling</h3>
        <p>Each Server operates as a fully independent node connected to through a peer-to-peer caching layer. This allows you to setup as many Servers as you want, and then query against </p>
      </section>

      <section class="mt-20">
        <h3 class="font-light text-2xl">Server Is the Cornerstone of Ulixee's Economy</h3>
        <p>Server opens a whole world of possibilities within the Ulixee ecosystem. You can keep it private to you and your organization, or you can connect it to the global Ulixee Cloud. The latter allows you to generate passive income from any unused machine resources.</p>
      </section>
    </div>
  </MainLayout>
</template>

<script lang="ts">
import * as Vue from "vue";
import InstallIt from '@/components/InstallIt.vue';
import StartIt from '@/components/StartIt.vue';
import UseIt from '@/components/UseIt.vue';
import Command from '@/components/Command.vue';
import { AboveTheFold, MainHeader, SubHeader, ActionButtons } from "../components";

export default Vue.defineComponent({
  components: {
    InstallIt,
    StartIt,
    UseIt,
    Command,
    MainHeader,
    SubHeader,
    AboveTheFold,
    ActionButtons,
  }
});
</script>