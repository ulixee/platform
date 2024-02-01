<template>
  <pre
    ref="preRef"
    class="normalize-whitespace"
    :class="{
      ['language-' + language]: true,
      'line-numbers': ['javascript', 'typescript'].includes(language),
      ulixeeTheme: useUlixeeTheme,
    }"
  >

    <code
ref="codeRef"
:class="'language-'+language"
v-html="code"
/>
  </pre>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { ref, watch } from 'vue';
import Prism from 'prismjs';
import 'prismjs/plugins/normalize-whitespace/prism-normalize-whitespace.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import 'prismjs/plugins/line-highlight/prism-line-highlight.js';
import 'prismjs/plugins/autoloader/prism-autoloader.js';
import 'prismjs/components/prism-sql.js';
import 'prismjs/plugins/toolbar/prism-toolbar.css';
import 'prismjs/plugins/toolbar/prism-toolbar';
import 'prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard.js';

import 'prismjs/themes/prism.css';
import '@/assets/style/code.scss';
import '@/assets/style/line-numbers.scss';

export default Vue.defineComponent({
  props: {
    language: {
      type: String,
      default: 'javascript',
    },
    useUlixeeTheme: {
      type: Boolean,
      default: true,
    },
  },
  setup(props, { slots }) {
    const code = ref<string>('');

    const preRef = ref(null);
    const codeRef = ref(null);

    const prismLanguage = Prism.languages[props.language];
    if (!prismLanguage) {
      Prism.plugins.autoloader.loadLanguages([props.language]);
    }
    watch(
      () => slots.default(),
      slots => {
        const nw = Prism.plugins.NormalizeWhitespace;
        const block = nw.normalize(slots[0]?.children, {
          // Extra settings
          indent: 0,
        });
        code.value = Prism.highlight(block, prismLanguage, props.language);
        Prism.highlightElement(codeRef.value);
      },
    );
    code.value = Prism.highlight(slots.default()[0].children, prismLanguage, props.language);

    return {
      preRef,
      codeRef,
      code,
    };
  },
  mounted() {
    Prism.highlightAll();
  },
});
</script>
