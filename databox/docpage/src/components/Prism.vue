<script lang="ts">
import * as Vue from 'vue';
import Prism from 'prismjs';
import 'prismjs/plugins/normalize-whitespace/prism-normalize-whitespace.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';

import '../index.css';
import 'prismjs/themes/prism.css';
import '../assets/scss/code.scss';
import '../assets/scss/line-numbers.scss';
import '../assets/scss/DocsPage.scss';

export default Vue.defineComponent({
  props: {
    code: {
      type: String,
    },
    inline: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      default: 'markup',
    },
    useUlixeeTheme: {
      type: Boolean,
      default: true,
    }
  },
  setup(props, { slots, attrs }) {
    const { h } = Vue;
    const slotsData = (slots && slots.default && slots.default()) || [];
    const { inline, language } = props;
    const prismLanguage = Prism.languages[language];
    const code = props.code || (slotsData.length > 0 ? slotsData[0].children : '');

    let className = `language-${language} normalize-whitespace`;
    if (['javascript', 'typescript'].includes(language)) {
      className += ' line-numbers';
    }
    if (props.useUlixeeTheme) {
      className += ' ulixeeTheme'
    }

    if (inline) {
      return () =>
        h('code', { ...attrs, class: [attrs.class, className], innerHTML: Prism.highlight(code, prismLanguage) });
    }

    const d = Prism.highlight(code, prismLanguage);
    return () =>
      h('pre', { ...attrs, class: [attrs.class, className] }, [
        h('code', {
          class: className,
          innerHTML: d,
        }),
      ]);
  },
  mounted() {
    Prism.highlightAll();
  }
});
</script>