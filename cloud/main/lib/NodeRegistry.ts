import Identity from '@ulixee/crypto/lib/Identity';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';

export default class NodeRegistry {
  public register(_nodeAddress: URL, _identity: Identity): Promise<void> {
    return null;
  }

  public getNodes(): INodeInfo[] {
    return [];
  }
}
