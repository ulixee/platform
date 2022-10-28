<template>
  <MainLayout :showPadding="false">
    <div class="border-b border-slate-300 px-6 py-5 text-xl font-light text-slate-700">
      {{ toolName }} Documentation
    </div>
    <div class="mt-2 flex flex-col-reverse items-start items-stretch px-6 pb-10 md:flex-row">
      <div class="LEFTBAR md:pr-12">
        <template v-if="links" v-for="(group, i1) in links" :key="`title-${i1}`">
          <h3 class="mt-5 whitespace-nowrap font-bold">{{ group.title }}</h3>
          <template v-for="(item, i2) in group.items" :key="`title-${i1}-${i2}`">
            <template v-if="item.items">
              <h4 class="whitespace-nowrap font-bold">{{ item.title }}</h4>
              <template v-for="(itm, i3) in item.items" :key="`link-${i1}-${i2}-${i3}`">
                <router-link
                  :class="{ isSelected: isSelected(itm.link) }"
                  class="block whitespace-nowrap"
                  :to="itm.link"
                >
                  {{ itm.title }}
                </router-link>
              </template>
            </template>
            <template v-else>
              <router-link
                :class="{ isSelected: isSelected(item.link) }"
                class="block whitespace-nowrap"
                :to="item.link"
              >
                {{ item.title }}
              </router-link>
            </template>
          </template>
        </template>
      </div>

      <div class="DocsContent flex-1">
        <div class="mx-3 mt-5 md:mx-32">
          <div class="post mb" v-html="page.content"></div>
        </div>
        <!-- p
          a.github-edit-link(:href="editLink" target="_blank")
            GithubLogo
            span Edit this page on GitHub
        nav.docs-nav
          .docs-nav__previous
            g-link.button.button--small.docs-nav__link(v-if="previousPage" exact :to="previousPage.link")
              | &larr; {{ previousPage.title }}
          .docs-nav__next
            g-link.button.button--small.docs-nav__link(v-if="nextPage" exact :to="nextPage.link")
              | {{ nextPage.title }} &rarr; -->
      </div>

      <div class="RIGHTBAR hidden md:block">
        <template v-if="page.subtitles.length && page.subtitles[0].depth === 2">
          <h3 class="mb-2 font-bold">On this page</h3>
          <ul class="u" v-if="page.subtitles.length">
            <li
              :class="'depth-' + subtitle.depth"
              v-for="subtitle in page.subtitles"
              :key="subtitle.value"
            >
              <a :href="subtitle.anchor" v-html="subtitle.value.replace(' W3C', '').split(/\s/g)[0]"></a
              >
            </li>
          </ul>
        </template>
      </div>
    </div>
  </MainLayout>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { useRoute } from 'vue-router';
import Data, { extractToolKey, IPage } from '@/lib/Data';
import { Prism } from '@/main';

const toolNames: { [key: string]: string } = {
  hero: 'Hero',
  databox: 'Databox',
  miner: 'Miner',
};

export default Vue.defineComponent<any>({
  async setup() {
    const route = useRoute();
    const links = Vue.ref();
    const page = Vue.ref<IPage>({ content: '', title: '', subtitles: [] });
    const toolKey = extractToolKey(route.path);
    const toolName = toolNames[toolKey];

    await Promise.all([
      Data.fetchDocLinks(route.path).then(x => (links.value = x)),
      Data.fetchDocPage(route.path).then(x => (page.value = x)),
    ]);

    return {
      links,
      page,
      toolName,
    };
  },
  mounted() {
    Prism.highlightAll();
  },
  methods: {
    isSelected(path: string) {
      return this.$route.path === path || path === `${this.$route.path}/overview/introduction`;
    },
  },
  computed: {
    currentPath(): any {
      return this.$route.matched[0].path;
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
        this.items.findIndex((item: any) => {
          return item.link.replace(/\/$/, '') === this.$route.path.replace(/\/$/, '');
        }) ?? this.items.findIndex((x: any) => !x.isHeader)
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
});
</script>

<style lang="scss">
.LEFTBAR {
  box-shadow: 1px 0 0 white;
  @apply border-slate-300 md:border-r;

  a {
    font-size: 0.9rem;
    margin-top: 5px;
    line-height: 1em;
    padding: 3px 0;
    @apply text-gray-700 no-underline;

    &.isSelected {
      @apply text-ulixee-normal border-ulixee-normal border-l-4 pl-2;
    }
  }
}

.RIGHTBAR {
  padding-top: 75px;
  width: 220px;
  padding-right: 25px;

  .depth-2 {
    font-size: 0.85rem;
  }
  .depth-3 {
    font-size: 0.8rem;
    padding-left: 15px;
  }
  li {
    padding: 0.4rem 0;
    border-top: 1px dashed #c5d3e0;
  }
  a {
    display: block;
    width: 100%;
    @apply truncate text-gray-700 no-underline;
    &.isSelected {
      @apply text-ulixee-normal;
    }
  }
}
</style>
