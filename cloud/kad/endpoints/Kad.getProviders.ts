import KadApiHandler from './KadApiHandler';

export default new KadApiHandler('Kad.getProviders', {
  async handler({ key }, context) {
    const { connection, kad } = context;
    const { providers, peerRouting, peerStore } = kad;
    const peerNodeInfo = connection.nodeInfo;

    const closerPeers = peerRouting.getCloserPeersOffline(
      key,
      kad.nodeInfo.nodeId,
      peerNodeInfo.nodeId,
    );
    const providerPeers = providers
      .getProviders(key)
      .map(x => peerStore.get(x))
      .filter(x => x && x.nodeId !== peerNodeInfo.nodeId);

    context.logger.info('Kad.getProviders', {
      key,
      providerPeers: providerPeers.length,
      closerPeers: closerPeers.length,
    });
    return {
      providerPeers,
      closerPeers,
    };
  },
});
