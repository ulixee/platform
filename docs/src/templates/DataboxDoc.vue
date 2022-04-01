<template lang="pug">
  DocsPage(:links="links" :rootPath="rootPath" :page="$page" :route="$route" :nav-title="navTitle")
</template>

<page-query>
  query ($id: ID!) {
    record: databoxDocs (id: $id) {
      title
      headings (depth: h1) {
        value
      }
      subtitles: headings {
        depth
        value
        anchor
      }
    }
  }
</page-query>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import generateLinks, { INavGroup } from '../lib/generateLinks';
import DocsPage from '../components/DocsPage.vue';

const linkGroups = require(`${__dirname}/../../../databox/docs/links.yaml`);

const links = generateLinks(linkGroups, 'DataboxDocs');

@Component({
  // @ts-ignore
  metaInfo() {
    // @ts-ignore
    const { title, headings } = this.$page.record;
    return {
      title: title || (headings.length ? headings[0].value : undefined),
    };
  },
  components: {
    DocsPage,
  },
})
export default class HeroDoc extends Vue {
  public $page: any;
  public $route: any;
  public links: INavGroup[] = links;
  public rootPath = '/docs/databox';
  public navTitle = 'Databox'
}
</script>

<style lang="scss">
@import '../assets/style/reset';
</style>
