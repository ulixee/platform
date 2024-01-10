"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const NodeRegistryServiceClient_1 = require("./NodeRegistryServiceClient");
class NodeRegistry {
    constructor(config) {
        this.config = config;
        const { nodeTracker, kad, serviceClient } = config;
        this.kad = kad;
        this.nodeTracker = nodeTracker;
        this.trackPeer = this.trackPeer.bind(this);
        this.nodeTracker.on('new', this.trackPeer);
        if (serviceClient) {
            this.serviceClient = new NodeRegistryServiceClient_1.default(serviceClient, this.config.datastoreCore, this.config.heroCore, () => ({
                clients: this.config.publicServer.connections,
                peers: this.kad?.connectedPeers ?? 0,
            }));
        }
    }
    async close() {
        await this.serviceClient?.close();
        this.nodeTracker.off('new', this.trackPeer);
        // clear out memory
        this.config = null;
        this.serviceClient = null;
    }
    async register(identity) {
        this.nodeMeta = {
            nodeId: identity?.bech32,
            apiHost: await this.config.publicServer.host,
            kadHost: this.kad?.nodeInfo.kadHost,
            isClusterNode: true,
            lastSeenDate: new Date(),
        };
        this.nodeTracker.track(this.nodeMeta);
        if (this.serviceClient) {
            if (!identity)
                throw new Error('You must configure a network identity (ULX_NETWORK_IDENTITY_PATH) to use the node registry service.');
            const { nodes } = await this.serviceClient.register(this.nodeMeta);
            for (const node of nodes) {
                this.nodeTracker.track(node);
            }
        }
    }
    async getNodes(count = 25) {
        if (this.nodeTracker.nodes.length < count && this.serviceClient) {
            const clusterNodes = await this.serviceClient.getNodes(count);
            for (const node of clusterNodes.nodes) {
                this.nodeTracker.track(node);
            }
        }
        if (this.nodeTracker.nodes.length < count && this.kad) {
            const networkNodes = this.kad.getKnownNodes(count);
            for (const node of networkNodes) {
                this.nodeTracker.track({
                    nodeId: node.nodeId,
                    apiHost: node.apiHost,
                    kadHost: node.kadHost,
                    lastSeenDate: node.lastSeenDate,
                    isClusterNode: false,
                });
            }
        }
        return this.nodeTracker.nodes.slice(0, count);
    }
    trackPeer(evt) {
        const { node } = evt;
        if (this.kad && node.kadHost) {
            void this.kad.addPeer(node).catch(() => null);
        }
    }
}
exports.default = NodeRegistry;
//# sourceMappingURL=NodeRegistry.js.map