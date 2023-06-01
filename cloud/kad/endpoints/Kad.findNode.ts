import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import Identity from '@ulixee/crypto/lib/Identity';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import KadApiHandler from './KadApiHandler';

export default new KadApiHandler('Kad.findNode', {
  async handler({ key }, context) {
    const { kad, connection } = context;
    const { nodeInfo } = kad;

    // NOTE: this key might not be an identity! You can search for nodes closest to a key buffer too
    const searchForNodeId = encodeBuffer(key, Identity.encodingPrefix);

    let closerPeers: INodeInfo[] = [];

    if (kad.nodeInfo.nodeId === searchForNodeId) {
      closerPeers = [nodeInfo];
    } else {
      closerPeers = context.kad.peerRouting.getCloserPeersOffline(
        key,
        kad.nodeInfo.nodeId,
        connection.nodeInfo.nodeId,
      );
    }

    if (closerPeers.length === 0) {
      context.logger.info('Kad.findNode:NothingCloser', {
        searchForNodeId,
        key,
      });
    }

    return { closerPeers };
  },
});
