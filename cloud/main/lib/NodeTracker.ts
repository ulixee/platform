import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import INodeRegistryApiTypes, {
  ICloudNodeMeta,
} from '@ulixee/platform-specification/services/NodeRegistryApis';

type THealth = INodeRegistryApiTypes['NodeRegistry.health']['args'];

export default class NodeTracker extends TypedEventEmitter<{ new: { node: ICloudNodeMeta } }> {
  public get count(): number {
    return this.nodesInSeenOrder.length;
  }

  public get nodes(): ICloudNodeMeta[] {
    return [...this.nodesInSeenOrder];
  }

  private readonly nodeHealthByIdentity: { [nodeId: string]: THealth } = {};
  private readonly nodesByIdentity: { [nodeId: string]: ICloudNodeMeta } = {};
  private nodesInSeenOrder: ICloudNodeMeta[] = [];

  constructor(readonly lastSeenCutoffMinutes = 120) {
    super();
  }

  public track(node: ICloudNodeMeta): { nodes: ICloudNodeMeta[] } {
    if (this.nodesByIdentity[node.nodeId]) {
      const lastSeen = this.nodesByIdentity[node.nodeId].lastSeenDate;
      if (node.lastSeenDate > lastSeen) {
        this.nodesByIdentity[node.nodeId].lastSeenDate = node.lastSeenDate;
      }
      this.sortSeenNodes();
      return;
    }

    node.lastSeenDate ??= new Date();
    this.nodesByIdentity[node.nodeId] = node;
    this.nodesInSeenOrder.push(node);
    this.sortSeenNodes();
    this.emit('new', { node });

    const nodes = this.nodes;
    return { nodes };
  }

  public checkin(health: THealth): void {
    this.nodeHealthByIdentity[health.nodeId] = health;
    this.nodesByIdentity[health.nodeId].lastSeenDate = new Date();
    this.sortSeenNodes();
  }

  private sortSeenNodes(): void {
    this.prune();
    this.nodesInSeenOrder.sort((a, b) => b.lastSeenDate.getTime() - a.lastSeenDate.getTime());
  }

  private prune(): void {
    // prune unseen connections
    const lastSeenCutoff = Date.now() - this.lastSeenCutoffMinutes * 60e3;
    this.nodesInSeenOrder = this.nodesInSeenOrder.filter(x => {
      if (x.lastSeenDate.getTime() < lastSeenCutoff) {
        delete this.nodesByIdentity[x.nodeId];
        return false;
      }
      return true;
    });
  }
}
