<template>
  <div v-if="createdCollapseGroupId && isGroupCollapsed" class="collapse-container">
    <a
      :style="{ paddingLeft: indentPx }"
      href="javascript:void(0)"
      :groupId="createdCollapseGroupId"
      class="collapse-group"
      @click.prevent="openCollapseGroup"
      >----------- show
      {{ hiddenNodeGroups.frameNodeIdsByGroupId.get(createdCollapseGroupId).length }} hidden DOM elements
      ------------</a
    >
    <DomNode
      v-for="node of children"
      :node-state="node"
      :indent="indent + 1"
      :hidden-node-groups="hiddenNodeGroups"
    />
  </div>

  <div
    :nodeId="nodeState.nodeId"
    :class="{
      node: true,
      doctype: nodeState.isDoctype,
      comment: nodeState.isComment,
      'text-node': nodeState.isTextNode,
      element: nodeState.isElement,
      removed: nodeState.changes.removed,
      added: nodeState.changes.added,
      'no-children': !nodeState.hasElementChildren,
      'multi-line': nodeState.hasText && nodeState.isMultiline,
      empty: nodeState.isTextNode && !nodeState.hasText,
      collapsed: isCollapsed,
      hidden: isGroupCollapsed,
    }"
  >
    <span
      v-if="nodeState.isTextOnlyNode"
      class="text observable"
      :style="{ paddingLeft: isInlineTag ? 0 : indentPx }"
    >
      <slot v-if="nodeState.isComment">// </slot>{{ nodeState.textContent ?? '' }}
    </span>
    <slot v-else-if="nodeState.isDocument || nodeState.isShadowRoot">
      <DomNode
        v-for="node of children"
        :node-state="node"
        :indent="indent + 1"
        :hidden-node-groups="hiddenNodeGroups"
      />
    </slot>
    <slot v-else>
      <div class="element-start observable" :style="{ paddingLeft: indentPx }">
        <a
          class="expander"
          @click.prevent="nodeState.isManuallyExpanded = !nodeState.isManuallyExpanded"
          >{{ !isCollapsible ? '' : isCollapsed ? '+' : '-' }}</a
        >
        <span class="open-tag">{{ openTag }}</span>

        <span class="attr" v-if="nodeState.classAttr">
          <span class="attr-name">class</span>
          <span class="attr-eq">="</span>
          <span
            class="attr-value attr-classname observable"
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
            class="attr-value attr-style observable"
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
          class="attr observable"
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
          class="prop observable"
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

      <span v-if="isCollapsed">...</span>
      <slot v-else>
        <DomNode
          v-for="node of children"
          :node-state="node"
          :indent="indent + 1"
          :hidden-node-groups="hiddenNodeGroups"
        />
      </slot>
      <div
        class="element-end observable"
        v-if="!nodeState.isVoidElement"
        :style="{ paddingLeft: isInlineTag ? 0 : indentPx }"
      >
        {{ closeTag }}
      </div>
    </slot>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import DomNodeState from './DomNodeState';
import { IHiddenNodeGroups } from './index.vue';

const DomNode = defineComponent({
  name: 'DomNode',
  components: {},
  props: {
    nodeState: {
      type: Object as PropType<DomNodeState>,
      required: true,
    },
    indent: Number,
    hiddenNodeGroups: {
      type: Object as PropType<IHiddenNodeGroups>,
      required: true,
    },
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
    children() {
      const children = this.nodeState.children;
      if (this.nodeState.contentDocument) {
        children.push(...this.nodeState.contentDocument.children);
      }
      return children;
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
      if (this.nodeState.isTextNode && this.nodeState.isMultiline) return true;
      return this.nodeState.hasElementChildren;
    },
    isCollapsed() {
      if (this.nodeState.isManuallyExpanded === true) return false;
      if (this.nodeState.isManuallyExpanded === false) return true;
      if (this.isCollapsible === false) return false;

      return !this.nodeState.hasTreeChanges;
    },
    isGroupCollapsed() {
      if (!this.collapseGroupId) return false;
      return this.hiddenNodeGroups.isExpandedByGroupId.get(this.collapseGroupId) !== true;
    },
    isInlineTag() {
      if (this.nodeState.isComment) return false;
      if (this.nodeState.isTextNode) return !this.nodeState.isMultiline;
      if (!this.nodeState.hasElementChildren) return true;
      if (this.nodeState.childNodeIds.length === 1 && this.nodeState.children[0]?.isMultiline) {
        return false;
      }
      return this.isCollapsed;
    },
    indentPx(): string {
      return `${this.indent * 5}px`;
    },
    collapseGroupId(): number {
      return this.hiddenNodeGroups.collapsedGroupIdByFrameNodeId.get(this.nodeState.frameNodeId);
    },
    createdCollapseGroupId(): number {
      return this.hiddenNodeGroups.createdGroupIdByFrameNodeId.get(this.nodeState.frameNodeId);
    },
  },
  setup(props) {},
  methods: {
    openCollapseGroup() {
      this.hiddenNodeGroups.isExpandedByGroupId.set(this.collapseGroupId, true);
    },
  },
  beforeUnmount() {},
});
export default DomNode;
</script>

<style lang="scss">
@import '../../assets/style/resets';

.added > .observable,
.added.observable {
  color: #059d05 !important;
}
.changed > .observable,
.changed.observable {
  color: #0eb7de !important;
}
.removed > .observable,
.removed.observable {
  color: red !important;
}

.collapse-container {
  a {
    margin: 8px 0;
    display: block;
    text-indent: 13px; // offset for expander
    color: #868686;
    text-decoration: none;
    font-size: 0.9em;
    font-style: italic;
  }
}

.comment {
  white-space: pre;
  color: #ababab;
  text-indent: 13px; // offset for expander
}
.doctype {
  color: grey;
  text-indent: 13px; // offset for expander
  margin-left: 5px;
}
.text-node {
  white-space: pre;
  color: #595959;
  display: inline;
  text-indent: 13px; // offset for expander
  &.multi-line {
    display: block;
  }
  &.empty {
    display: none;
  }
}

.node > .element-start:hover,
.node > .element-end:hover,
.node.no-children:hover,
.node.collapsed:hover {
  background-color: aliceblue;
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

.node {
  > .element-start,
  > .element-end {
    display: block;
  }
  > .element-end {
    text-indent: 13px;
  }
  &.collapsed {
    > .element-start,
    > .element-end {
      display: inline;
      text-indent: 0;
    }
  }

  &.no-children {
    > .element-start,
    > .element-end {
      display: inline;
    }
    > .element-end,
    > .text-node {
      text-indent: 0;
    }
    > .multi-line + .element-end,
    > .text-node.multi-line {
      text-indent: 13px;
      display: block;
    }
  }

  &.hidden {
    > .element-start,
    > .element-end,
    > .text,
    > span {
      display: none !important;
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
