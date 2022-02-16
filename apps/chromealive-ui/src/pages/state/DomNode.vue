<template>
  <div
    :class="{
      doctype: nodeState.isDoctype,
      comment: nodeState.isComment,
      'text-node': nodeState.isTextNode,
      element: nodeState.isElement,
      removed: nodeState.changes.removed,
      added: nodeState.changes.added,
      'no-children': !nodeState.hasElementChildren,
      'multi-line': nodeState.hasText && nodeState.textContent.length > 100,
      empty: nodeState.hasText && !nodeState.textContent.trim(),
      collapsed: isCollapsed,
    }"
  >
    <slot v-if="nodeState.isTextOnlyNode"
      ><slot v-if="nodeState.isComment">// </slot>{{ nodeState.textContent?.trim() ?? '' }}
    </slot>
    <slot v-else-if="nodeState.isDocument || nodeState.isShadowRoot">
      <DomNode v-for="node of nodeState.children" :node-state="node" :indent="indent + 1" />
    </slot>
    <slot v-else>
      <div class="element-start">
        <a class="expander" @click.prevent="isExpanded = !isExpanded">{{
          !isCollapsible ? '' : isCollapsed ? '+' : '-'
        }}</a>
        <span class="open-tag">{{ openTag }}</span>

        <span class="attr" v-if="nodeState.classAttr">
          <span class="attr-name">class</span>
          <span class="attr-eq">="</span>
          <span
            class="attr-value attr-classname"
            v-for="clazz of classes"
            :class="{
              added: nodeState.changes.classes?.added.has(clazz),
              removed: nodeState.changes.classes?.removed.has(clazz),
            }"
            >{{ clazz }}</span
          >{{ '"' }}
        </span>
        <span class="attr" v-if="nodeState.styleAttr">
          <span class="attr-name">style</span>
          <span class="attr-eq">="</span>
          <span
            class="attr-value attr-style"
            v-for="style of styles"
            :class="{
              added: nodeState.changes.styles?.added.has(style.name),
              changed: nodeState.changes.styles?.changed.has(style.name),
              removed: nodeState.changes.styles?.removed.has(style.name),
            }"
            >{{ style.name }}: {{ style.value }};</span
          >{{ '"' }}
        </span>
        <span
          class="attr"
          v-for="attr of attributes"
          :class="{
            added: nodeState.changes.attrs?.added.has(attr.name),
            changed: nodeState.changes.attrs?.changed.has(attr.name),
            removed: nodeState.changes.attrs?.removed.has(attr.name),
          }"
        >
          <span class="attr-name">{{ attr.name }}</span>
          <span class="attr-eq" v-if="attr.value !== undefined">=</span>
          <span class="attr-value" v-if="attr.value !== undefined">"{{ attr.value }}"</span>
        </span>
        <span
          class="prop"
          v-for="prop of properties"
          :class="{
            added: nodeState.changes.props?.added.has(prop.name),
            changed: nodeState.changes.props?.changed.has(prop.name),
            removed: nodeState.changes.props?.removed.has(prop.name),
          }"
        >
          <span class="prop-name">[{{ prop.name }}]</span>
          <span class="prop-eq" v-if="prop.value !== undefined">=</span>
          <span class="prop-value" v-if="prop.value !== undefined">{{
            JSON.stringify(prop.value).substring(0, 25)
          }}</span>
        </span>
        <span class="open-tag-end">{{ nodeState.isVoidElement ? '/>' : '>' }}</span>
      </div>

      <slot v-if="isCollapsed">...</slot>
      <slot v-else>
        <DomNode v-for="node of nodeState.children" :node-state="node" :indent="indent + 1" />
        <DomNode
          v-if="nodeState.contentDocument"
          v-for="node of nodeState.contentDocument.children"
          :node-state="node"
          :indent="indent + 1"
        />
      </slot>
      <div class="element-end" v-if="!nodeState.isVoidElement">{{ closeTag }}</div>
    </slot>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { defineComponent, PropType } from 'vue';
import DomNodeState from '@/pages/state/DomNodeState';

const DomNode = defineComponent({
  name: 'DomNode',
  components: {},
  props: {
    nodeState: {
      type: Object as PropType<DomNodeState>,
      required: true,
    },
    indent: Number,
  },
  emits: [],
  computed: {
    openTag() {
      return `<${this.nodeState.tagName}`;
    },
    closeTag() {
      return `</${this.nodeState.tagName}>`;
    },
    classes() {
      const classes = [...this.nodeState.classes];
      if (this.nodeState.changes.classes) {
        for (const removed of this.nodeState.changes.classes.removed) {
          classes.push(removed);
        }
      }
      return classes;
    },
    styles() {
      const styles = [...this.nodeState.styles];
      if (this.nodeState.changes.styles) {
        for (const removed of this.nodeState.changes.styles.removed) {
          styles.push(removed);
        }
      }
      return styles.map(([name, value]) => ({ name, value }));
    },
    attributes() {
      const attrs = [...this.nodeState.attributes];
      if (this.nodeState.changes.attrs) {
        for (const removed of this.nodeState.changes.attrs.removed) {
          attrs.push(removed);
        }
      }
      return attrs.map(([name, value]) => ({ name, value }));
    },
    properties() {
      const props = [...this.nodeState.properties];

      if (this.nodeState.changes.props) {
        for (const removed of this.nodeState.changes.props.removed) {
          props.push(removed);
        }
      }

      return props.map(([name, value]) => ({ name, value }));
    },
    isCollapsible() {
      if (this.nodeState.isDocument || this.nodeState.isDoctype || this.nodeState.isShadowRoot)
        return false;
      return this.nodeState.hasElementChildren;
    },
    isCollapsed() {
      if (this.isExpanded === true) return false;
      if (this.isExpanded === false) return true;
      if (this.isCollapsible === false) return false;

      return !this.nodeState.hasTreeChanges;
    },
    margin(): string {
      return `${this.indent * 2}px`;
    },
  },
  setup(props) {
    return {
      isExpanded: Vue.ref<boolean>(null),
    };
  },
  methods: {
  },
  beforeUnmount() {},
});
export default DomNode;
</script>

<style lang="scss">
@import '../../assets/style/resets';

.added {
  color: #059d05 !important;
}
.changed {
  color: #9bf69b !important;
}
.removed {
  color: red !important;
}

.comment {
  white-space: pre;
  color: #ababab;
  padding-left: 13px; // offset for expander
}
.doctype {
  color: grey;
  padding-left: 13px; // offset for expander
  margin-left: 8px;
}
.text-node {
  white-space: pre;
  color: #595959;
  display: inline;
  padding-left: 13px; // offset for expander
  &.multi-line {
    display: block;
  }
  &.empty {
    display: none;
  }
}

.element,
.text-node,
.comment {
  margin-left: 8px;
}

.attr,
.prop,
.attr-classname,
.attr-style {
  margin-left: 5px;
}
.attr-eq + .attr-classname,
.attr-eq + .attr-style {
  margin-left: 0;
}

.element {
  > .element-start,
  > .element-end {
    display: block;
  }
  > .element-end {
    padding-left: 13px;
  }
  &.collapsed {
    > .element-start,
    > .element-end {
      display: inline-block;
      padding-left: 0;
    }
  }

  &.no-children {
    > .element-start,
    > .element-end {
      display: inline-block;
    }
    > .element-end,
    > .text-node {
      padding-left: 0;
    }
    > .multi-line + .element-end, > .text-node.multi-line {
      padding-left: 13px;
    }
  }

  .expander {
    display: inline-block;
    width: 8px;
    color: cornflowerblue;
    font-size: 16px;
    line-height: 16px;
    font-weight: bold;
    margin-right: 5px;
    cursor: pointer;
  }
}
</style>
