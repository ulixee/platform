import { nanoid } from 'nanoid';
import KadApiHandler from './KadApiHandler';

export default new KadApiHandler('Kad.connect', {
  async handler({ nodeInfo, presharedNonce, connectToNodeId }, context) {
    if (connectToNodeId && connectToNodeId !== context.kad.nodeInfo.nodeId) {
      throw new Error(`The requested nodeId (${connectToNodeId}) is not hosted here`);
    }

    context.connection.nodeInfo = nodeInfo;
    context.connection.presharedNonce = presharedNonce;

    const nonce = nanoid(18);
    context.connection.ourNonce = nonce;

    context.kad.peerStore.add(nodeInfo);

    context.logger.boundContext ??= {};
    context.logger.boundContext.remoteNodeId = nodeInfo.nodeId;
    return {
      nonce,
      nodeInfo: { ...context.kad.nodeInfo, lastSeenDate: undefined },
    };
  },
});
