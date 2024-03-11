"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
const net_1 = require("@ulixee/net");
const utils_1 = require("@ulixee/commons/lib/utils");
class ApiClient extends eventUtils_1.TypedEventEmitter {
    constructor(address, onEvent) {
        super();
        this.onEvent = onEvent;
        this.isConnected = false;
        try {
            const url = (0, utils_1.toUrl)(address);
            url.hostname.replace('localhost', '127.0.0.1');
            this.address = url.href;
        }
        catch (error) {
            console.error('Invalid API URL', error, { address });
            throw error;
        }
        this.transport = new net_1.WsTransportToCore(this.address);
        this.connection = new net_1.ConnectionToCore(this.transport);
        this.connection.on('event', this.onMessage.bind(this));
        this.connection.on('disconnected', this.onDisconnected.bind(this));
    }
    async connect() {
        await this.connection.connect(false, 15e3);
        this.isConnected = true;
    }
    async disconnect() {
        this.isConnected = false;
        await this.connection.disconnect();
    }
    async send(command, ...args) {
        return await this.connection.sendRequest({ command, args });
    }
    onDisconnected() {
        this.emit('close');
    }
    onMessage(message) {
        if (message === 'exit') {
            this.onEvent('App.quit');
            return;
        }
        const apiEvent = message.event;
        this.onEvent(apiEvent.eventType, apiEvent.data);
    }
}
exports.default = ApiClient;
//# sourceMappingURL=ApiClient.js.map