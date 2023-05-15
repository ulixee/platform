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

  private readonly nodeHealthByIdentity: { [identity: string]: THealth } = {};
  private readonly nodesByIdentity: { [identity: string]: ICloudNodeMeta } = {};
  private nodesInSeenOrder: ICloudNodeMeta[] = [];

  constructor(readonly lastSeenCutoffMinutes: number = 120) {
    super();
    this.onSeen = this.onSeen.bind(this);
  }

  public track(node: ICloudNodeMeta): { nodes: ICloudNodeMeta[] } {
    if (this.nodesByIdentity[node.identity]) {
      const lastSeen = this.nodesByIdentity[node.identity].lastSeenDate;
      if (node.lastSeenDate > lastSeen) {
        this.nodesByIdentity[node.identity].lastSeenDate = node.lastSeenDate;
      }
      this.sortSeenNodes();
      return;
    }

    node.lastSeenDate ??= new Date();
    this.nodesByIdentity[node.identity] = node;
    this.nodesInSeenOrder.push(node);
    this.sortSeenNodes();
    this.emit('new', { node });

    const nodes = this.nodes;
    return { nodes };
  }

  public onSeen(evt: { node: { identity: string; lastSeenDate: Date } }): void {
    const { node } = evt;
    if (!this.nodesByIdentity[node.identity]) return;
    this.nodesByIdentity[node.identity].lastSeenDate = node.lastSeenDate;
  }

  public checkin(health: THealth): void {
    this.nodeHealthByIdentity[health.identity] = health;
    this.nodesByIdentity[health.identity].lastSeenDate = new Date();
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
        delete this.nodesByIdentity[x.identity];
        return false;
      }
      return true;
    });
  }
}
