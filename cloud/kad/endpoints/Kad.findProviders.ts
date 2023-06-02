import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import KadApiHandler from './KadApiHandler';

export default new KadApiHandler('Kad.findProviders', {
  async handler({ key }, context) {
    const { connection, kad } = context;
    const { providers, peerRouting, peerStore } = kad;
    const peerNodeInfo = connection.nodeInfo;

    const closerPeers = peerRouting.getCloserPeersOffline(
      key,
      kad.nodeInfo.nodeId,
      peerNodeInfo.nodeId,
    );

    const localProviders = providers.getProviders(key);
    const providerPeers: INodeInfo[] = [];
    for (const nodeId of localProviders) {
      // don't tell them about themself
      if (nodeId === peerNodeInfo.nodeId) continue;
      const nodeInfo = peerStore.get(nodeId);
      if (nodeInfo) providerPeers.push(nodeInfo);
    }

    return {
      providerPeers,
      closerPeers,
    };
  },
});
