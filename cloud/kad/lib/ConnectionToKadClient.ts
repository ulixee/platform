import Resolvable from '@ulixee/commons/lib/Resolvable';
import { ConnectionToClient } from '@ulixee/net';
import { IKadApis } from '@ulixee/platform-specification/cloud/KadApis';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';

export default class ConnectionToKadClient extends ConnectionToClient<IKadApis, {}> {
  public nodeInfo: INodeInfo;
  public presharedNonce: string;
  public ourNonce: string;
  public verifiedPromise = new Resolvable<void>();
}
