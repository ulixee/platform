import { sha256 } from '@ulixee/commons/lib/hashUtils';
import { InvalidSignatureError } from '@ulixee/crypto/lib/errors';
import Identity from '@ulixee/crypto/lib/Identity';
import KadApiHandler from './KadApiHandler';

export default new KadApiHandler('Kad.verify', {
  async handler({ signature }, context) {
    const presharedNonce = context.connection.presharedNonce;
    const connectingNodeId = context.connection.nodeInfo.nodeId;
    const thisNodeId = context.kad.nodeInfo.nodeId;

    const signatureMessage = sha256(
      `${[presharedNonce, context.connection.ourNonce, connectingNodeId, thisNodeId].join('_')}`,
    );
    const isValid = Identity.verify(connectingNodeId, signatureMessage, signature);
    if (!isValid) throw new InvalidSignatureError(`Failed node verification process`);

    const oursignature = context.kad.identity.sign(signatureMessage);
    context.connection.verifiedPromise.resolve();
    context.kad.peerStore.nodeVerified(connectingNodeId);

    return { signature: oursignature };
  },
});
