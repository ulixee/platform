"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ReplayRegistryServiceClient {
    constructor(client) {
        this.client = client;
    }
    async store(details) {
        return await this.client.sendRequest({
            command: 'ReplayRegistry.store',
            args: [details],
        });
    }
    async get(sessionId) {
        return await this.client.sendRequest({
            command: 'ReplayRegistry.get',
            args: [{ sessionId }],
        });
    }
    async ids() {
        return await this.client.sendRequest({
            command: 'ReplayRegistry.ids',
            args: [{}],
        });
    }
}
exports.default = ReplayRegistryServiceClient;
//# sourceMappingURL=ReplayRegistryServiceClient.js.map