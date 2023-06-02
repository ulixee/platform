import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import KadApiHandler from './KadApiHandler';

export default new KadApiHandler('Kad.findNode', {
  async handler({ key }, context) {
    const { kad, connection } = context;
    const { nodeInfo } = kad;

    let closerPeers: INodeInfo[] = [];

    if (kad.nodeInfo.kadId === key) {
      closerPeers = [nodeInfo];
    } else {
      closerPeers = context.kad.peerRouting.getCloserPeersOffline(
        key,
        kad.nodeInfo.nodeId,
        connection.nodeInfo.nodeId,
      );
    }

    return { closerPeers };
  },
});
