<template>
  <MainLayout class="ChromeAlive" :showPadding="false">
    <AboveTheFold>
      <MainHeader productKey="databox">Ulixee Databox</MainHeader>

      <AlertDevelopmentEnvironment />

      <h2 class="font-bold mt-8">Add Databox to package.json</h2>
      <p>
       Install both Databox and Hero with a single NPM/Yarn command.
      </p>
      
      <Prism language="shell">
        npm install @ulixee/databox-for-hero
      </Prism>

      <h2 class="font-bold mt-8">Create Your First Databox</h2>
      <p>The following script is exactly the same as the <router-link to="/hero/example">Hero Example</router-link>  except this one is wrapped in a Databox. </p>
      <Prism language="javascript">
        import DataboxForHero from '@ulixee/databox-for-hero';
        
        export new DataboxForHero(async { hero, output } => {
          await hero.goto('https://ulixee.org/tryit/welcome-to-hero');
          
          output.title = await hero.querySelector('.title').innerText;
          
          await hero.querySelector('button.next-page').click();
          
          await hero.waitForState(assert => {
            assert(hero.querySelector('.loading').getAttribute('data-pct'), 100);
          });

          output.description = await hero.querySelector('.description');
        });
      </Prism>
      
      <p>You can run above code directly from the command line by using `node example-databox.js`, but the real power 
        comes when you activate it with <router-link to="/chromealive">ChromeAlive</router-link> or query it through a
        <router-link to="/stream">Stream</router-link>.</p>
    </AboveTheFold>
  </MainLayout>
</template>

<script lang="ts">
import * as Vue from "vue";
import InstallIt from '@/components/InstallIt.vue';
import Dependencies from '@/components/Dependencies.vue';
import UseIt from '@/components/UseIt.vue';
import Command from '@/components/Command.vue';
import { AboveTheFold, MainHeader, SubHeader, ActionButtons } from "../components";
import Prism from "@/components/Prism.vue";
import AlertDevelopmentEnvironment from "../components/AlertDevelopmentEnvironment.vue";

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
    Prism,
    AlertDevelopmentEnvironment
}
});
</script>