<template>
  <MainLayout class="ChromeAlive" :showPadding="false">
    <AboveTheFold>
      <MainHeader productKey="stream">Ulixee Stream</MainHeader>
      <SubHeader>
        Query and Transform Data Across<br />
        Many Different Sources and Formats
      </SubHeader>

      <p class="w-10/12">
        Stream is a uniform library for querying and retrieving datasets across any scraper script wrapped in a Datastore. You can make a single query or large querysets in parallel. And you can pipe, transform, reduce and explode datasets from the output of one Datastore to the input of another.
      </p>

      <ActionButtons productKey="stream" />

      <div class="relative h-60">
        <inline-svg :src="require('@/assets/illustrations/datastore.svg')" height="65" class="absolute top-0 left-[20%]" />
        <inline-svg :src="require('@/assets/illustrations/datastore.svg')" height="65" class="absolute top-0 right-[25%]" />
        <inline-svg :src="require('@/assets/illustrations/transformer.svg')" height="70" class="absolute bottom-[-3px] right-[25%]" />
        <!-- <div class="PIPE w-10/12"></div> -->
        <div class="OUTSIDE-CIRCLE"></div>
        <div class="INSIDE-CIRCLE"></div>
        <!-- <div class="PIPE mt-16 w-10/12"></div> -->
      </div>
    </AboveTheFold>

    <section>
      <header>Script Locally, Run Remotely</header>
      <p>Add as many queries and Clouds, and let Stream handle managing the parallel operation.</p>
    </section>

    <section>
      <header>Intelligent Parallelization</header>
      <p>Stream monitors each Cloud node’s load capacity to distribute your queries in the most efficient manner possible.</p>
    </section>

    <section>
      <header>Advanced Stream Transformations</header>
      <ul>
        <li>
          <title>Transform (1 to 1)</title>
          <p>These are custom functions that attach to the output of datastores, instantly transforming their output into a different data structure. It’s especially powerful when used in combination with one of the other transformations.</p>
        </li>

        Pipe (1 to 1)
        Seamlessly connect the output of one datastore (or transform function) into the input of another datastore. For example, query a list of OpenTable restaurants then pass the output of those results into an OpenTable availability Datastore to see what times are available tonight.

        Explode (1 to n)
        Similar to Pipe, except the output of each Datastore is split into muliple inputs to the next Datastore. For example, explode the OpenTable restaurant list into multiple availability checks for each restaurant — i.e, perhaps you want to see which days have a 6:30pm - 7:30pm availability over the next two weeks.

        Collapse (n to 1)
        This is the exact opposite of Explode, allowing multiple outputs to be condensed into a smaller collection of inputs. For example, if you want to query concert listings only on the days with 6:30-7:30pm restaurant availability, use Collapse to send only the available days through to the concert query.

        Save (n)
        Persist the data from your stream into any format. You can even inject multiple saves at different stages along the stream.
      </ul>
    </section>

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

<style lang="scss" scoped>
.PIPE {
  height: 50px;
  border: 3px solid black;
  border-left: none;
  border-right: none;
}

.INSIDE-CIRCLE {
  border: 4px solid black;
  border-left: none;
  border-radius: 0 500px 500px 0;
  height: 50%;
  width: calc(100% - 70px);
  position: absolute;
  top: 25%;
  left: 0;
}
.OUTSIDE-CIRCLE {
  border: 4px solid black;
  border-left: none;
  border-radius: 0 500px 500px 0;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}
</style>
