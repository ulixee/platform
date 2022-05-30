<script lang="ts">
import * as Vue from 'vue';
import { Prism } from '@/main';
import { Slots, VNode } from 'vue';

declare type Data = Record<string, unknown>;

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
  setup(props, { slots, attrs }: { slots: Slots; attrs: Data }) {
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
      return (): VNode =>
        h('code', { ...attrs, class: [attrs.class, className], innerHTML: Prism.highlight(code, prismLanguage) });
    }


    const d = Prism.highlight(code, prismLanguage);
    return (): VNode =>
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