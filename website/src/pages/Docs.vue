<template lang="pug">
  BasicLayout.Docs
    Section(container="md" dots="true")
      .post-header.container-md.mb-x2
        h1 The Platform  Built for Scraping
        p.
          Ulixee is a toolset that makes it a cinch to deploy a data collection network.

        h5 Learn about our Tooling:
        ul
          li
            a(href="/docs/hero") Hero:
            span.description The W3C-spec Headless Web Browser that's nearly impossible to detect.
          li
            a(href="/docs/databox") Databox:
            span.description Create composable, re-usable, configurable scripts.
          li
            a(href="/docs/server") Server:
            span.description Easily run across multiple machines.
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component({
  components: {},
})
export default class Home extends Vue {
}
</script>

<style lang="scss">
.Docs {
  .description {
    margin-left: 5px;
  }
}
</style>
