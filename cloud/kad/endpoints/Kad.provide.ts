import KadApiHandler from './KadApiHandler';

export default new KadApiHandler('Kad.provide', {
  async handler({ key }, context) {
    const { connection, kad, logger } = context;
    const peerNodeInfo = connection.nodeInfo;

    logger.stats('Provider.received', {
      key,
      kadHost: peerNodeInfo.kadHost,
      providerNodeId: peerNodeInfo.nodeId,
    });

    kad.providers.addProvider(key, peerNodeInfo.nodeId);
    const closerPeers = context.kad.peerRouting.getCloserPeersOffline(
      key,
      kad.nodeInfo.nodeId,
      peerNodeInfo.nodeId,
    );

    return {
      closerPeers,
    };
  },
});
