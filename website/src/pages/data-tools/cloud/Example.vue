<template>
  <MainLayout class="ChromeAlive" :showPadding="false">
    <AboveTheFold>
      <MainHeader productKey="cloud">Ulixee Cloud</MainHeader>

      <AlertDevelopmentEnvironment />

      <h2 class="font-bold mt-8">Just Launch It</h2>
      <p>
        The easiest way to start Ulixee Cloud is with our one-line NPX command -- you don't even need to install it through NPM or Yarn beforehand.
      </p>

      <Prism language="shell">
        npx @ulixee/cloud start
      </Prism>

      <p>There are several flags you can add to the start command. Below are two of them:</p>
      <ul>
        <li>--port=80</li>
        <li>-x (disable ChromeAlive, even if installed locally)</li>
      </ul>

      <p>Open the docs to see your full options.</p>
    </AboveTheFold>
  </MainLayout>
</template>

<script lang="ts">
import * as Vue from "vue";
import InstallIt from '@/components/InstallIt.vue';
import StartIt from '@/components/StartIt.vue';
import UseIt from '@/components/UseIt.vue';
import Command from '@/components/Command.vue';
import { AboveTheFold, MainHeader, SubHeader, ActionButtons } from "../components";
import AlertDevelopmentEnvironment from "../components/AlertDevelopmentEnvironment.vue";
import Prism from "@/components/Prism.vue";

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
    AlertDevelopmentEnvironment,
    Prism
}
});
</script>
