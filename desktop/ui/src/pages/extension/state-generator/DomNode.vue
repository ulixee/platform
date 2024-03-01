<template>
  <div v-if="createdCollapseGroupId && isGroupCollapsed" class="collapse-container">
    <a
      :style="{ paddingLeft: indentPx }"
      href="javascript:void(0)"
      :groupId="createdCollapseGroupId"
      class="collapse-group"
      @click.prevent="openCollapseGroup"
    >----------- show
      {{ hiddenNodeGroups.frameNodeIdsByGroupId.get(createdCollapseGroupId).length }} hidden DOM
      elements ------------</a>
    <DomNode
      v-for="node of children"
      :key="node.nodeId"
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
        :key="node.nodeId"
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
        >{{ !isCollapsible ? '' : isCollapsed ? '+' : '-' }}</a>
        <span class="open-tag">{{ openTag }}</span>

        <span v-if="nodeState.classAttr" class="attr">
          <span class="attr-name">class</span>
          <span class="attr-eq">="</span>
          <span
            v-for="clazz of classes"
            class="attr-value attr-classname observable"
            :class="{
              added: nodeState.changes.classes?.added.has(clazz),
              removed: nodeState.changes.classes?.removed.has(clazz),
            }"
          >{{ clazz }}</span>{{ '"' }}
        </span>
        <span v-if="nodeState.styleAttr" class="attr">
          <span class="attr-name">style</span>
          <span class="attr-eq">="</span>
          <span
            v-for="style of styles"
            class="attr-value attr-style observable"
            :class="{
              added: nodeState.changes.styles?.added.has(style.name),
              changed: nodeState.changes.styles?.changed.has(style.name),
              removed: nodeState.changes.styles?.removed.has(style.name),
            }"
          >{{ style.name }}: {{ style.value }};</span>{{ '"' }}
        </span>
        <span
          v-for="attr of attributes"
          class="attr observable"
          :class="{
            added: nodeState.changes.attrs?.added.has(attr.name),
            changed: nodeState.changes.attrs?.changed.has(attr.name),
            removed: nodeState.changes.attrs?.removed.has(attr.name),
          }"
        >
          <span class="attr-name">{{ attr.name }}</span>
          <span v-if="attr.value !== undefined" class="attr-eq">=</span>
          <span v-if="attr.value !== undefined" class="attr-value">"{{ attr.value }}"</span>
        </span>
        <span
          v-for="prop of properties"
          class="prop observable"
          :class="{
            added: nodeState.changes.props?.added.has(prop.name),
            changed: nodeState.changes.props?.changed.has(prop.name),
            removed: nodeState.changes.props?.removed.has(prop.name),
          }"
        >
          <span class="prop-name">[{{ prop.name }}]</span>
          <span v-if="prop.value !== undefined" class="prop-eq">=</span>
          <span v-if="prop.value !== undefined" class="prop-value">{{
            JSON.stringify(prop.value).substring(0, 25)
          }}</span>
        </span>
        <span class="open-tag-end">{{ nodeState.isVoidElement ? '/>' : '>' }}</span>
      </div>

      <span v-if="isCollapsed">...</span>
      <slot v-else>
        <DomNode
          v-for="node of children"
          :key="node.nodeId"
          :node-state="node"
          :indent="indent + 1"
          :hidden-node-groups="hiddenNodeGroups"
        />
      </slot>
      <div
        v-if="!nodeState.isVoidElement"
        class="element-end observable"
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
  setup(props) {},
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
  beforeUnmount() {},
  methods: {
    openCollapseGroup() {
      this.hiddenNodeGroups.isExpandedByGroupId.set(this.collapseGroupId, true);
    },
  },
});
export default DomNode;
</script>

<style lang="scss">
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
