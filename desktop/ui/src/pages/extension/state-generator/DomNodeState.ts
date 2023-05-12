import { DomActionType, IFrontendDomChangeEvent } from '@ulixee/hero-interfaces/IDomChangeEvent';

const voidElementsRegex =
  /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i;

export default class DomNodeState {
  isConnectedToHierarchy: boolean;
  isManuallyExpanded: boolean = null;

  contentDocument?: DomNodeState; // for frames

  textContent: string;
  nodeType: NodeType;
  tagName: string;
  parentNodeId: number;
  previousSiblingId: number;
  isMultiline = false;
  readonly frameNodeId: string; // frameId_nodeId;
  readonly childNodeIds: number[] = [];
  readonly attributes = new Map<string, string>();
  readonly classes = new Set<string>();
  readonly styles = new Map<string, string>();
  readonly properties = new Map<string, string | number | string[] | boolean>();

  classAttr: string;
  styleAttr: string;

  readonly changes: {
    added?: boolean;
    removed?: boolean;
    props?: {
      added: Set<string>;
      changed: Set<string>;
      removed: Map<string, string | number | string[] | boolean>;
    };
    attrs?: {
      added: Set<string>;
      changed: Set<string>;
      removed: Map<string, string>;
    };
    classes?: {
      added: Set<string>;
      removed: Set<string>;
    };
    styles?: {
      added: Set<string>;
      changed: Set<string>;
      removed: Map<string, string>;
    };
    removedChildIds?: Set<number>;
  } = {};

  get isVoidElement(): boolean {
    return voidElementsRegex.test(this.tagName);
  }

  get isTextNode(): boolean {
    return this.nodeType === NodeType.Text;
  }

  get isElement(): boolean {
    return this.nodeType === NodeType.Element;
  }

  get isDocument(): boolean {
    return this.nodeType === NodeType.Document;
  }

  get isDoctype(): boolean {
    return this.nodeType === NodeType.DocumentType;
  }

  get isComment(): boolean {
    return this.nodeType === NodeType.Comment;
  }

  get isShadowRoot(): boolean {
    return this.nodeType === NodeType.ShadowRoot;
  }

  get hasChanges(): boolean {
    return !!(
      this.changes.added ||
      this.changes.removed ||
      this.changes.removedChildIds ||
      this.changes.props ||
      this.changes.attrs ||
      this.changes.classes ||
      this.changes.styles
    );
  }

  get hasTreeChanges(): boolean {
    if (this.hasChanges) return true;

    for (const child of this.children) {
      if (child.hasTreeChanges) return true;
    }
    return false;
  }

  get isConnected(): boolean {
    if (this.isConnectedToHierarchy === false) return false;
    if (!this.parentNode) {
      return this.nodeType === NodeType.Document || this.nodeType === NodeType.DocumentType;
    }
    return this.parentNode.isConnected;
  }

  get parentNode(): DomNodeState {
    return this.nodesById[this.parentNodeId];
  }

  get parentElement(): DomNodeState {
    let element = this.parentNode;
    while (element) {
      if (element.nodeType === NodeType.Element) return element;
      element = element.parentNode;
    }
    return null;
  }

  get isTextOnlyNode(): boolean {
    return this.isComment || this.isTextNode || this.isDoctype;
  }

  get hasText(): boolean {
    return this.isTextOnlyNode && !!this.textContent;
  }

  get hasElementChildren(): boolean {
    for (const childId of this.childNodeIds) {
      const node = this.nodesById[childId];
      if (node.isElement || node.isShadowRoot) return true;
    }
    if (this.changes?.removedChildIds) {
      for (const childId of this.changes.removedChildIds) {
        const node = this.nodesById[childId];
        if (node.isElement || node.isShadowRoot) return true;
      }
    }
    return false;
  }

  get childElements(): DomNodeState[] {
    return this.childNodeIds.map(x => this.nodesById[x]).filter(x => x.isElement || x.isShadowRoot);
  }

  get children(): DomNodeState[] {
    const children = this.childNodeIds.map(x => this.nodesById[x]).filter(Boolean);
    if (this.changes?.removedChildIds?.size) {
      for (const childId of this.changes.removedChildIds) {
        const removed = this.nodesById[childId];
        if (!removed) continue;

        const idx = children.findIndex(x => x.nodeId === removed.previousSiblingId) + 1;
        children.splice(idx, 0, removed);
      }
    }
    return children;
  }

  constructor(readonly frameId: number, private nodesById: Record<number, DomNodeState>, readonly nodeId: number) {
    this.frameNodeId = `${frameId}_${nodeId}`;
  }

  remove(highlight: boolean): void {
    if (highlight) {
      this.changes.removed = true;
      if (this.changes.added) this.changes.added = false;
      // clear out changes
      this.changes.styles = undefined;
      this.changes.attrs = undefined;
      this.changes.props = undefined;
      this.changes.classes = undefined;
    }

    this.parentNode.removeChild(this.nodeId, highlight);
    // remove hierarchy
    this.isConnectedToHierarchy = false;
    for (const child of this.children) {
      child.remove(highlight);
    }
  }

  removeChild(nodeId: number, highlight: boolean) {
    const prevIndex = this.childNodeIds.indexOf(nodeId);
    if (prevIndex !== -1) {
      this.childNodeIds.splice(prevIndex, 1);
      if (highlight) {
        this.changes.removedChildIds ??= new Set();
        this.changes.removedChildIds.add(nodeId);
      }
    }
  }

  apply(change: IFrontendDomChangeEvent, highlightChange: boolean): void {
    if (change.tagName) this.tagName = change.tagName.toLowerCase();
    if (change.nodeType) this.nodeType = change.nodeType;
    if (change.textContent) {
      this.textContent = change.textContent.trim();
      this.isMultiline = /\r?\n/.test(this.textContent);
    }

    if (change.attributes) {
      for (const [name, value] of Object.entries(change.attributes)) {
        if (name === 'class') {
          const classes = new Set((value ?? '').split(' ').map(x => x.trim()));

          if (highlightChange) this.trackClassChange(classes);

          this.classAttr = value;
          this.classes.clear();
          classes.forEach(x => this.classes.add(x));
        } else if (name === 'style') {
          const styles = DomNodeState.parseStyle(value);

          if (highlightChange) this.trackStyleChanges(styles);

          this.styleAttr = value;
          this.styles.clear();
          for (const [style, styleValue] of styles) {
            this.styles.set(style, styleValue);
          }
        } else {
          if (highlightChange) this.trackAttrChange(name, value);

          if (value === null) {
            this.attributes.delete(name);
          } else {
            this.attributes.set(name, value ?? undefined);
          }
        }
      }
    }

    if (change.properties) {
      for (const [name, value] of Object.entries(change.properties)) {
        if (highlightChange) {
          this.trackPropChange(name, value);
        }
        if (value === null) {
          this.properties.delete(name);
        } else {
          this.properties.set(name, value);
        }
      }
    }

    if (change.parentNodeId) {
      this.parentNodeId = change.parentNodeId;
    }

    if (change.previousSiblingId) {
      this.previousSiblingId = change.previousSiblingId;
    }

    if (change.action === DomActionType.removed) {
      this.remove(highlightChange);
    }

    if (change.action === DomActionType.added) {
      if (highlightChange) {
        this.changes.removed = false;
        this.changes.added = true;
      }

      this.isConnectedToHierarchy = true;
      if (this.parentNodeId) {
        const prevIndex = this.parentNode.childNodeIds.indexOf(change.previousSiblingId) + 1;
        this.parentNode.childNodeIds.splice(prevIndex, 0, this.nodeId);
      }
    }
  }

  trackClassChange(newClasses: Set<string>) {
    this.changes.classes ??= { added: new Set(), removed: new Set() };
    for (const clazz of newClasses) {
      if (!this.classes.has(clazz)) this.changes.classes.added.add(clazz);
    }
    for (const clazz of this.classes) {
      if (!newClasses.has(clazz)) this.changes.classes.removed.add(clazz);
    }
  }

  trackStyleChanges(styles: Map<string, string>) {
    this.changes.styles ??= { added: new Set(), removed: new Map(), changed: new Set() };

    for (const [name, value] of styles) {
      DomNodeState.trackValueChange(this.styles, name, value, this.changes.styles);
    }
  }

  trackAttrChange(name: string, value: string) {
    if (name === 'class' || name === 'style') return;
    this.changes.attrs ??= { added: new Set(), removed: new Map(), changed: new Set() };
    DomNodeState.trackValueChange(this.attributes, name, value, this.changes.attrs);
  }

  trackPropChange(name: string, value: string | string[] | number | boolean) {
    this.changes.props ??= { added: new Set(), removed: new Map(), changed: new Set() };
    DomNodeState.trackValueChange(this.properties, name, value, this.changes.props);
  }

  static trackValueChange<T>(
    currentValues: Map<string, T>,
    name: string,
    value: T,
    changes: { added: Set<string>; removed: Map<string, T>; changed: Set<string> },
  ) {
    if (value === null) {
      if (!changes.added.has(name)) {
        changes.removed.set(name, currentValues.get(name));
      }
    } else if (currentValues.has(name)) {
      if (!changes.added.has(name)) {
        changes.changed.add(name);
        changes.removed.delete(name);
      }
    } else {
      changes.added.add(name);
      changes.removed.delete(name);
    }
  }

  static parseStyle(attr: string): Map<string, string> {
    const stylesByName = new Map<string, string>();
    if (!attr) return stylesByName;

    let offset = 0;
    let chunk = '';
    let nextSplit: number;
    while (offset < attr.length) {
      nextSplit = attr.indexOf(';', offset);
      if (nextSplit === -1) {
        nextSplit = attr.length;
      }

      chunk += attr.substring(offset, nextSplit);

      // data URIs can contain semicolons, so make sure we get the whole thing
      if (/url\([^)]+$/.test(chunk)) {
        chunk += ';';
        offset = nextSplit + 1;
        continue;
      }

      const item = chunk.trim();
      if (item) {
        const pos = item.indexOf(':');
        const key = item.substring(0, pos).trim();
        const value = item.substring(pos + 1).trim();
        stylesByName.set(key, value);
      }
      chunk = '';
      offset = nextSplit + 1;
    }

    return stylesByName;
  }
}

export enum NodeType {
  Element = 1,
  Text = 3,
  Comment = 8,
  Document = 9,
  DocumentType = 10,
  ShadowRoot = 40,
}
