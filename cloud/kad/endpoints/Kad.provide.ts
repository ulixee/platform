import KadApiHandler from './KadApiHandler';

export default new KadApiHandler('Kad.provide', {
  async handler({ key }, context) {
    const { connection, kad, logger } = context;
    const nodeInfo = connection.nodeInfo;

    logger.stats('Provider.received', {
      key,
      kadHost: nodeInfo.kadHost,
      providerNodeId: nodeInfo.nodeId,
    });

    kad.providers.addProvider(key, nodeInfo.nodeId);
    // don't send back the requestor
    const closerPeers = context.kad.peerRouting.getCloserPeersOffline(
      key,
      kad.nodeInfo.nodeId,
      nodeInfo.nodeId,
    );

    return {
      closerPeers,
    };
  },
});
