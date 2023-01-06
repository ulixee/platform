<template>
  <MainLayout class="ChromeAlive" :showPadding="false">
    <AboveTheFold>
      <MainHeader productKey="stream">Ulixee Stream</MainHeader>

      <AlertDevelopmentEnvironment />

      <h2 class="font-bold mt-8">Add Stream to package.json</h2>
      <p>
        Install Hero into your local project with NPM or Yarn.
      </p>
      <Prism language="bash">
        npm install @ulixee/stream
      </Prism>

      <h2 class="font-bold mt-8">Create Your First Stream</h2>
      <p>
        Each
      </p>
      <Prism language="javascript">
        import Stream from '@ulixee/stream';

        const stream = new Stream(`example-datastore.js`);
        stream.query({

        }).then(data => {
          console.log(data);
        });
      </Prism>

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
    Prism
}
});
</script>
