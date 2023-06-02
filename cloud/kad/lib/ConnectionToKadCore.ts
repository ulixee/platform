import { sha256 } from '@ulixee/commons/lib/hashUtils';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import { toUrl } from '@ulixee/commons/lib/utils';
import { InvalidSignatureError } from '@ulixee/crypto/lib/errors';
import Identity from '@ulixee/crypto/lib/Identity';
import { ConnectionToCore } from '@ulixee/net';
import ITransport from '@ulixee/net/interfaces/ITransport';
import { IKadApis } from '@ulixee/platform-specification/cloud/KadApis';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import { nanoid } from 'nanoid';
import ConnectionToKadClient from './ConnectionToKadClient';
import { Kad } from './Kad';

export default class ConnectionToKadCore extends ConnectionToCore<IKadApis, {}> {
  public nodeInfo: INodeInfo;
  public verifiedPromise: Resolvable<void>;

  constructor(private kad: Kad, transportToCore: ITransport) {
    super(transportToCore);
  }

  public async connectAndVerify(connectToNodeId: string, timeoutMs = 5e3): Promise<void> {
    if (this.verifiedPromise) return this.verifiedPromise;
    const resolvable = new Resolvable<void>();
    this.verifiedPromise = resolvable;
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

      if (connectToNodeId && nodeInfo.nodeId !== connectToNodeId) {
        throw new Error('Invalid nodeId returned.');
      }
      // sha256([presharedNonce, nonce, connector nodeId, host nodeId])
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
      resolvable.reject(error);
    }
    return this.verifiedPromise.promise;
  }

  public toClient(): ConnectionToKadClient {
    const connection = new ConnectionToKadClient(this.kad, this.transport);
    connection.verifiedPromise = this.verifiedPromise;
    void this.verifiedPromise.then(() => (connection.nodeInfo = this.nodeInfo));
    return connection;
  }

  public static fromClient(kad: Kad, client: ConnectionToKadClient): ConnectionToKadCore {
    const connection = new ConnectionToKadCore(kad, client.transport);
    connection.verifiedPromise = client.verifiedPromise;
    void client.verifiedPromise.then(() => (connection.nodeInfo = client.nodeInfo));
    return connection;
  }

  public static parseUrl(address: string): string {
    const url = toUrl(address);
    url.pathname = '/kad';
    return url.href;
  }
}
