<template>
  <MainLayout class="ChromeAlive" :showPadding="false">
    <AboveTheFold>
      <MainHeader productKey="chromealive">Chrome Alive</MainHeader>

      <AlertDevelopmentEnvironment />

      <h2 class="font-bold mt-8">Add Hero and ChromeAlive to package.json</h2>
      <p>
        Use NPM or Yarn to install Hero and ChromeAlive into your local project.
      </p>

      <Prism language="shell">
        npm install @ulixee/hero
        npm install @ulixee/chromealive
      </Prism>

      <p>And you don't even need to install ChromeAlive to your local project so long as Ulixee Desktop is running.</p>

      <h2 class="font-bold mt-8">Launch ChromeAlive From Inside Your Hero Script</h2>

      <Prism language="javascript">
        import Hero from '@ulixee/hero';

        (async function run() {
          &nbsp; const hero = new Hero({ showChromeAlive: true });
          &nbsp; await hero.goto('https://ulixee.org/tryit/chromealive');
          &nbsp; const title = hero.querySelector('title');
          &nbsp; console.log(title);
        })();
      </Prism>
    </AboveTheFold>
  </MainLayout>
</template>

<script lang="ts">
import * as Vue from "vue";
import { HeartIcon } from '@heroicons/vue/solid';
import InstallIt from '@/components/InstallIt.vue';
import Dependencies from '@/components/Dependencies.vue';
import UseIt from '@/components/UseIt.vue';
import Command from '@/components/Command.vue';
import { AboveTheFold, MainHeader, SubHeader, ActionButtons } from "../components";
import AlertDevelopmentEnvironment from "../components/AlertDevelopmentEnvironment.vue";
import Prism from "@/components/Prism.vue";

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
    AlertDevelopmentEnvironment,
    Prism
}
});
</script>