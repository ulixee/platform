<template>
  <div class="wrapper">
    <DomNode
      v-if="mainFrame && mainFrame.document"
      :node-state="mainFrame.document"
      :indent="0"
      :hidden-node-groups="hiddenNodeGroups"
    />
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Client from '../../api/Client';
import { DomActionType, IFrontendDomChangeEvent } from '@ulixee/hero-interfaces/IDomChangeEvent';
import DomNodeState from './DomNodeState';
import DomNode from './DomNode.vue';
import IChromeAliveEvents from '@ulixee/apps-chromealive-interfaces/events';
import { IChromeAliveApis } from '@ulixee/apps-chromealive-interfaces/apis';

export interface IDomFrameNodes {
  nodesById: Record<number, DomNodeState>;
  document?: DomNodeState;
}

// FrameAndNodeId is necessary because of overlapping ids. frameId_nodeId
export interface IHiddenNodeGroups {
  isExpandedByGroupId: Map<number, boolean>;
  frameNodeIdsByGroupId: Map<number, string[]>;
  collapsedGroupIdByFrameNodeId: Map<string, number>;
  createdGroupIdByFrameNodeId: Map<string, number>;
}

export default Vue.defineComponent({
  name: 'StatePanel',
  components: { DomNode },
  setup() {
    return {
      focusedPaintIndex: Vue.ref<number>(null),
      paintEvents: Vue.reactive<IFrontendDomChangeEvent[][]>([]),
      loadedIndex: Vue.ref<number>(-1),
      domNodesByFrameId: Vue.reactive<Record<number, IDomFrameNodes>>({}),
      framesById: Vue.reactive(new Map<number, { parentId: number; domNodeId: number }>()),
      mainFrameIds: Vue.reactive(new Set<number>()),
      activeGroupId: -1,
      latestGroupId: 0,
      hiddenNodeGroups: Vue.reactive<IHiddenNodeGroups>({
        isExpandedByGroupId: new Map(),
        frameNodeIdsByGroupId: new Map(),
        collapsedGroupIdByFrameNodeId: new Map(),
        createdGroupIdByFrameNodeId: new Map(),
      }),
    };
  },
  watch: {},
  computed: {
    mainFrame(): IDomFrameNodes {
      for (const frameId of this.mainFrameIds) {
        if (frameId in this.domNodesByFrameId) {
          return this.domNodesByFrameId[frameId] as IDomFrameNodes;
        }
      }
    },
  },
  methods: {
    setPaintEvents(
      paintEvents: IFrontendDomChangeEvent[][],
      framesById: { [id: number]: { parentId: number; domNodeId: number } },
    ) {
      this.paintEvents.length = paintEvents.length;
      for (let i = 0; i < paintEvents.length; i += 1) {
        // don't overwrite existing with empty
        if (paintEvents[i]?.length) {
          this.paintEvents[i] = paintEvents[i];
        }
      }
      (window as any).paintEvents = this.paintEvents;
      this.mainFrameIds.clear();
      this.framesById.clear();
      for (const [id, value] of Object.entries(framesById)) {
        if (!value.parentId) this.mainFrameIds.add(Number(id));
        this.framesById.set(Number(id), value);
      }

      if (!this.focusedPaintIndex) {
        const index = paintEvents.length - 1;
        this.setPaintIndex(index, [index, index]);
      }
    },
    setPaintIndex(
      index: number,
      highlightChangeIndices: [start: number, end: number],
      documentLoadPaintIndex = 0,
    ): void {
      if (index === this.loadedIndex) return;
      console.log('Setting paint index', {
        newIndex: index,
        currentIndex: this.loadedIndex,
        documentLoadPaintIndex,
        highlightChangeIndices,
        totalPaints: this.paintEvents.length,
      });

      if (index === -1) {
        for (const frameId of Object.keys(this.domNodesByFrameId)) {
          this.domNodesByFrameId[frameId] = { nodesById: {} };
        }
      }

      for (let i = documentLoadPaintIndex; i <= index; i += 1) {
        if (!this.paintEvents[i]) continue;
        const highlight = i >= highlightChangeIndices[0] && i <= highlightChangeIndices[1];
        this.applyDomChanges(this.paintEvents[i], highlight);
      }

      this.loadedIndex = index;
      this.activeGroupId = 0;
      this.latestGroupId = 0;
      this.hiddenNodeGroups.frameNodeIdsByGroupId.clear();
      this.hiddenNodeGroups.isExpandedByGroupId.clear();
      this.hiddenNodeGroups.collapsedGroupIdByFrameNodeId.clear();
      this.hiddenNodeGroups.createdGroupIdByFrameNodeId.clear();
      this.findTreeChanges(this.mainFrame.document);
    },
    findTreeChanges(nodeState: DomNodeState): void {
      const groups = this.hiddenNodeGroups;

      if (nodeState.hasChanges) {
        this.activeGroupId = null;
      } else if (
        !nodeState.isDoctype &&
        !nodeState.isDocument &&
        nodeState.tagName !== 'html' &&
        !(nodeState.isTextNode && !nodeState.hasText)
      ) {
        if (this.activeGroupId) {
          groups.collapsedGroupIdByFrameNodeId.set(nodeState.frameNodeId, this.activeGroupId);
          groups.frameNodeIdsByGroupId.get(this.activeGroupId).push(nodeState.frameNodeId);
        } else {
          const nextId = (this.latestGroupId += 1);
          this.activeGroupId = nextId;
          groups.isExpandedByGroupId.set(nextId, false);
          groups.createdGroupIdByFrameNodeId.set(nodeState.frameNodeId, nextId);
          groups.collapsedGroupIdByFrameNodeId.set(nodeState.frameNodeId, nextId);
          groups.frameNodeIdsByGroupId.set(this.activeGroupId, [nodeState.frameNodeId]);
        }
      }

      for (const child of nodeState.children) {
        this.findTreeChanges(child);
      }
      if (nodeState.contentDocument) {
        for (const child of nodeState.contentDocument.children) {
          this.findTreeChanges(child);
        }
      }
    },
    applyDomChanges(changeEvents: IFrontendDomChangeEvent[], highlight: boolean): void {
      for (const change of changeEvents) {
        if (change.action === DomActionType.location) continue;

        if (change.action === DomActionType.newDocument) {
          this.domNodesByFrameId[change.frameId] = { nodesById: {} };
          continue;
        }

        try {
          this.domNodesByFrameId[change.frameId] ??= {
            nodesById: {},
          };
          const frameContext = this.domNodesByFrameId[change.frameId] as IDomFrameNodes;

          frameContext.nodesById[change.nodeId] ??= new DomNodeState(
            change.frameId,
            frameContext.nodesById,
            change.nodeId,
          );

          const domNode = frameContext.nodesById[change.nodeId];
          domNode.apply(change, highlight);

          if (domNode.isDocument) {
            frameContext.document = domNode;
            const frame = this.framesById.get(change.frameId);
            if (frame.parentId) {
              const parentFrameContext = this.domNodesByFrameId[frame.parentId];
              const containerFrameElement = parentFrameContext?.nodesById[frame.domNodeId];
              if (!containerFrameElement) {
                console.warn('Could not find dom node for frame', frame, change);
              } else {
                containerFrameElement.contentDocument = domNode;
              }
            }
          }
        } catch (error) {
          console.error('ERROR apply dom change', { change, error });
        }
      }
    },
    onDomFocus(event: IChromeAliveEvents['Dom.focus']): void {
      this.focusedPaintIndex = event.paintIndex;
      this.setPaintIndex(
        event.paintIndex,
        event.highlightPaintIndexRange,
        event.documentLoadPaintIndex,
      );
    },
    onDomUpdated(event: IChromeAliveEvents['Dom.updated']): void {
      this.setPaintEvents(event.paintEvents, event.framesById);
    },
    onDomResponse(response: IChromeAliveApis['Session.getDom']['result']): void {
      this.setPaintEvents(
        response.paintEvents.map(x => x.changeEvents),
        response.framesById,
      );
      Client.on('Dom.updated', this.onDomUpdated);
      Client.on('Dom.focus', this.onDomFocus);
    },
  },

  mounted() {
    Client.connect().catch(err => alert(err.stack));
    Client.send('Session.getDom')
      .then(this.onDomResponse)
      .catch(err => alert(err.stack));
  },

  beforeUnmount() {
    Client.off('Dom.updated', this.onDomUpdated);
    Client.off('Dom.focus', this.onDomFocus);
  },
});
</script>

<style lang="scss">
@import '../../assets/style/common-mixins';
@import '../../assets/style/resets';

:root {
  --toolbarBackgroundColor: #f5faff;
  --buttonActiveBackgroundColor: rgba(176, 173, 173, 0.4);
  --buttonHoverBackgroundColor: rgba(255, 255, 255, 0.08);
}

body {
  height: 100vh;
  margin: 0;
  border-top: 0 none;
  width: 100%;
}

.wrapper {
  box-sizing: border-box;
  background: white;
  margin: 0;
}
</style>
