"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Network = void 0;
const Logger_1 = require("@ulixee/commons/lib/Logger");
const TypedEventEmitter_1 = require("@ulixee/commons/lib/TypedEventEmitter");
const net_1 = require("@ulixee/net");
const ConnectionToKadClient_1 = require("./ConnectionToKadClient");
const ConnectionToKadCore_1 = require("./ConnectionToKadCore");
class Network extends TypedEventEmitter_1.default {
    constructor(kad) {
        super();
        this.kad = kad;
        this.connectionsByNodeId = {};
        this.connectionsByBlindDialHost = {};
        this.logger = (0, Logger_1.default)(module).log;
        this.running = false;
    }
    get connections() {
        return Object.keys(this.connectionsByNodeId).length;
    }
    async start() {
        if (this.running) {
            return;
        }
        this.running = true;
    }
    async stop() {
        this.running = false;
        await Promise.all(Object.values(this.connectionsByNodeId).map(x => x.disconnect()));
        this.connectionsByNodeId = {};
        this.connectionsByBlindDialHost = {};
    }
    isStarted() {
        return this.running;
    }
    async sendRequest(to, command, args, options) {
        if (!this.running) {
            return;
        }
        const connection = await this.dial(to.kadHost ?? to.apiHost, to.nodeId, options);
        await this.kad.routingTable.add(connection.nodeInfo.nodeId);
        this.logger.info('Network.sendRequest', { command, toNodeId: to.nodeId, args });
        const result = await connection.sendRequest({
            command,
            args: [args],
            startTime: Date.now(),
        });
        return { ...result, fromNodeId: to.nodeId };
    }
    async blindDial(address, options) {
        if (!this.running) {
            return;
        }
        address = ConnectionToKadCore_1.default.parseUrl(address);
        let connectionToCore = this.connectionsByBlindDialHost[address];
        let isNew = false;
        if (!connectionToCore) {
            connectionToCore = new ConnectionToKadCore_1.default(this.kad, new net_1.WsTransportToCore(address));
            isNew = true;
        }
        await connectionToCore.connectAndVerify(null, options?.timeoutMs);
        await this.kad.routingTable.add(connectionToCore.nodeInfo.nodeId);
        if (isNew && connectionToCore.nodeInfo) {
            delete this.connectionsByBlindDialHost[address];
            this.trackConnection(connectionToCore, connectionToCore.nodeInfo.nodeId);
            const connectionToClient = connectionToCore.toClient();
            this.kad.emit('duplex-created', { connectionToClient, connectionToCore });
        }
        return connectionToCore;
    }
    async dial(address, nodeId, options) {
        if (!this.running) {
            return;
        }
        let connectionToCore = this.connectionsByNodeId[nodeId];
        let isNew = false;
        if (!connectionToCore) {
            address = ConnectionToKadCore_1.default.parseUrl(address);
            connectionToCore = new ConnectionToKadCore_1.default(this.kad, new net_1.WsTransportToCore(address));
            this.trackConnection(connectionToCore, nodeId);
            isNew = true;
        }
        await connectionToCore.connectAndVerify(nodeId, options?.timeoutMs);
        await this.kad.routingTable.add(connectionToCore.nodeInfo.nodeId);
        if (isNew) {
            // register inverse connection
            const connectionToClient = connectionToCore.toClient();
            this.kad.emit('duplex-created', { connectionToClient, connectionToCore });
        }
        return connectionToCore;
    }
    async addConnectionToClient(transport) {
        const connectionToClient = new ConnectionToKadClient_1.default(this.kad, transport);
        const log = connectionToClient.logger;
        const parentLogId = log.info('addConnectionToClient.waitFor(verify)');
        await connectionToClient.verifiedPromise;
        const connectionToCore = ConnectionToKadCore_1.default.fromClient(this.kad, connectionToClient);
        const peerNodeInfo = connectionToClient.nodeInfo;
        this.trackConnection(connectionToCore, peerNodeInfo.nodeId);
        log.stats('addConnectionToClient.waitFor(verify):resolved', {
            parentLogId,
            nodeInfo: peerNodeInfo,
        });
        await this.kad.routingTable.add(peerNodeInfo.nodeId);
        this.kad.emit('duplex-created', { connectionToClient, connectionToCore });
        return connectionToClient;
    }
    trackConnection(connection, nodeId) {
        this.connectionsByNodeId[nodeId] = connection;
        connection.once('disconnected', () => {
            delete this.connectionsByNodeId[nodeId];
        });
    }
}
exports.Network = Network;
//# sourceMappingURL=Network.js.map