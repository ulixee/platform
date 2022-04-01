<template lang="pug">
  CoreLayout.has-sidebar.DocsPage(:footer="false")
    .container.flex.flex-align-top
      .sidebar
        h2.title {{navTitle}}
        template(v-if="links" v-for="(group, i1) in links")
          h3.menu-item(:key="`title-${i1}`") {{ group.title }}
          template(v-for="(item, i2) in group.items")
            template(v-if="item.items")
              h4.menu-item(:key="`title-${i1}-${i2}`") {{item.title}}
              template(v-for="(itm, i3) in item.items")
                g-link.menu-item.menu-link(:exact="itm.link == rootPath + '/'" :to="itm.link" :key="`link-${i1}-${i2}-${i3}`")
                  | {{ itm.title }}
            template(v-else)
              g-link.menu-item.menu-link(:exact="item.link == rootPath + '/'" :to="item.link" :key="`link-${i1}-${i2}`")
                | {{ item.title }}

      Section.doc-content.flex-fit(container="base")
        VueRemarkContent(class="post mb")
        p
          a.github-edit-link(:href="editLink" target="_blank")
            GithubLogo
            span Edit this page on GitHub
        nav.docs-nav
          .docs-nav__previous
            g-link.button.button--small.docs-nav__link(v-if="previousPage" exact :to="previousPage.link")
              | &larr; {{ previousPage.title }}
          .docs-nav__next
            g-link.button.button--small.docs-nav__link(v-if="nextPage" exact :to="nextPage.link")
              | {{ nextPage.title }} &rarr;

      .sidebar.sidebar--right.hide-for-small
        template(v-if="subtitles.length > 0 && subtitles[0].depth !== 3")
          h3 On this page
          ul.menu-item.submenu(v-if="subtitles.length")
            li.submenu__item(:class="'submenu__item-depth-' + subtitle.depth" v-for="subtitle in subtitles" :key="subtitle.value")
              a.submenu__link(:href="subtitle.anchor") {{ subtitle.value.replace(' W3C', '') }}
</template>

<script lang="ts">
import GithubLogo from '~/assets/logos/github.svg';

export default {
  components: {
    GithubLogo,
  },
  props: {
    page: {
      type: Object,
    },
    route: {
      type: Object,
    },
    links: {
      type: Array,
    },
    rootPath: {
      type: String,
    },
    navTitle: {
      type: String
    }
  },
  computed: {
    subtitles() {
      // Remove h1, h4, h5, h6 titles
      return this.page.record.subtitles.filter(function (value: any) {
        return [2, 3].includes(value.depth);
      });
    },
    currentPath() {
      return this.route.matched[0].path;
    },
    editLink() {
      return this.items[this.currentIndex]?.editLink;
    },
    items() {
      const items: { title: string; editLink?: string; isHeader?: boolean; link: string }[] = [];
      for (const group of this.links) {
        items.push({ title: group.title, link: group.link, isHeader: true });
        for (const item of group.items) {
          items.push({ title: item.title, link: item.link, editLink: item.editLink });
          if (item.items) items.push(...item.items);
        }
      }
      return items;
    },
    currentIndex() {
      if (this.currentPath === this.rootPath) return 1;
      return (
        this.items.findIndex(item => {
          return item.link.replace(/\/$/, '') === this.route.path.replace(/\/$/, '');
        }) ?? this.items.findIndex(x => !x.isHeader)
      );
    },
    nextPage() {
      for (let i = this.currentIndex + 1; i < this.items.length; i += 1) {
        const next = this.items[i];
        if (next.isHeader) continue;
        return next;
      }
      return null;
    },
    previousPage() {
      for (let i = this.currentIndex - 1; i >= 0; i -= 1) {
        const prev = this.items[i];
        if (prev.isHeader) continue;
        return prev;
      }
      return null;
    },
  },
};
</script>

<style lang="scss">
@import '../assets/style/reset';

.DocsPage {
  h2 {
    margin: 10px 0 5px;
    color: #595959;
    font-weight: normal;
    + .menu-item {
      margin-top: 5px;
    }
  }
  img {
    width: 100%;
    margin: 0;
    box-shadow: 0 0 16px rgba(0, 0, 0, 0.12), 0 -4px 10px rgba(0, 0, 0, 0.16);
  }
  ul.methods,
  ul.properties {
    @include reset-ul();
    & > li {
      margin-bottom: 20px;
      & > a {
        font-weight: bold;
        background-color: rgba(220, 220, 220, 0.5);
        font-size: 1rem;
      }
      & > div {
        margin-left: 10px;
      }
    }
  }
}
</style>
