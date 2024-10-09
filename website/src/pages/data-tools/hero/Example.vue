<template>
  <MainLayout class="ChromeAlive" :showPadding="false">

    <AboveTheFold>
      <MainHeader productKey="hero">Ulixee Hero</MainHeader>

      <AlertDevelopmentEnvironment />

      <h2 class="font-bold mt-8">Add Hero to package.json</h2>
      <p>
        Use NPM or Yarn to install Hero into your local project.
      </p>

      <Prism language="bash">npm install @ulixee/hero</Prism>

      <h2 class="font-bold mt-8">Create Your First Hero Script</h2>

      <p>Copy the following code into a Javascript or Typescript file and run it from the command line using `node example-hero.js`.</p>

      <Prism language="javascript">
        import Hero from '@ulixee/hero';

        (async function run(){
          const hero = new Hero();

          await hero.goto('https://ulixee.org/tryit/welcome-to-hero');

          const title = await hero.querySelector('.title').innerText;
          console.log(title);

          await hero.querySelector('button.next-page').click();

          await hero.waitForState(assert => {
            assert(hero.querySelector('.loading').getAttribute('data-pct'), 100);
          });

          cosnt description = await hero.querySelector('.description');
          console.log(description);

          await hero.close();
        })();
      </Prism>

      <p class="mt-10">A few things you'll notice about the above code:</p>
      <ul>
        <li>Line #8 - You can use awaited DOM calls directly in your script context. Unlike Puppeteer and Playwright code, Hero requires no special "evaluate" callback functions that run in a completely separate context.</li>
        <li>Lines #13-15 - Hero's waitForState makes it easy to know when a page is ready for extraction, regardless of how many redirects happen or what kind of dynamic loading is happening on the page.</li>
      </ul>
      <div class="mb-10"></div>
    </AboveTheFold>
  </MainLayout>
</template>

<script lang="ts">
import * as Vue from "vue";
import InstallIt from '@/components/InstallIt.vue';
import Dependencies from '@/components/Dependencies.vue';
import UseIt from '@/components/UseIt.vue';
import Command from '@/components/Command.vue';
import { CheckIcon, XMarkIcon } from '@heroicons/vue/24/solid';
import { AboveTheFold, MainHeader, SubHeader, ActionButtons } from "../components";
import AlertDevelopmentEnvironment from "../components/AlertDevelopmentEnvironment.vue";
import Prism from "@/components/Prism.vue";

export default Vue.defineComponent({
  components: {
    InstallIt,
    Dependencies,
    UseIt,
    Command,
    CheckIcon,
    XMarkIcon,
    MainHeader,
    SubHeader,
    AboveTheFold,
    ActionButtons,
    AlertDevelopmentEnvironment,
    Prism
}
});
</script>
