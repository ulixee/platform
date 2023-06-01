import { sha256 } from '@ulixee/commons/lib/hashUtils';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import { InvalidSignatureError } from '@ulixee/crypto/lib/errors';
import Identity from '@ulixee/crypto/lib/Identity';
import { ConnectionToCore } from '@ulixee/net';
import ITransportToCore from '@ulixee/net/interfaces/ITransportToCore';
import { IKadApis } from '@ulixee/platform-specification/cloud/KadApis';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import { nanoid } from 'nanoid';
import { Kad } from './Kad';

// TODO: we should share two-way connections!
export default class ConnectionToKadCore extends ConnectionToCore<IKadApis, {}> {
  public nodeInfo: INodeInfo;

  public verifiedPromise: Promise<Error | null>;

  constructor(private kad: Kad, transportToCore: ITransportToCore) {
    super(transportToCore);
  }

  public async connectAndVerify(connectToNodeId: string, timeoutMs = 5e3): Promise<Error | null> {
    if (this.verifiedPromise) return this.verifiedPromise;
    const resolvable = new Resolvable<Error | null>();
    this.verifiedPromise = resolvable.promise;
    try {
      await super.connect(true, timeoutMs);
      const presharedNonce = nanoid(18);
      const { nonce, nodeInfo } = await this.sendRequest({
        command: 'Kad.connect',
        args: [
          {
            nodeInfo: this.kad.nodeInfo,
            presharedNonce,
            connectToNodeId,
          },
        ],
      });

      await this.kad.peerStore.add(nodeInfo, false);
      this.nodeInfo = nodeInfo;

      // TODO: only need to verify if information changes

      if (nodeInfo.nodeId !== connectToNodeId) throw new Error('Invalid node id returned');
      // [presharedNonce, nonce, connector nodeId, host nodeId]
      const signatureMessage = sha256(
        `${[presharedNonce, nonce, this.kad.nodeInfo.nodeId, nodeInfo.nodeId].join('_')}`,
      );

      const { signature } = await this.sendRequest({
        command: 'Kad.verify',
        args: [{ signature: this.kad.identity.sign(signatureMessage) }],
      });

      const isValid = Identity.verify(connectToNodeId, signatureMessage, signature);
      if (!isValid) throw new InvalidSignatureError(`Failed node verification process`);

      await this.kad.peerStore.nodeVerified(nodeInfo.nodeId);
      resolvable.resolve(null);
    } catch (error) {
      resolvable.resolve(error);
    }
    return this.verifiedPromise;
  }
}
