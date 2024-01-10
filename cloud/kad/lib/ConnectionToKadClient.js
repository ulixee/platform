"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("@ulixee/commons/lib/Logger");
const Resolvable_1 = require("@ulixee/commons/lib/Resolvable");
const net_1 = require("@ulixee/net");
const ApiRegistry_1 = require("@ulixee/net/lib/ApiRegistry");
const Kad_connect_1 = require("../endpoints/Kad.connect");
const Kad_findNode_1 = require("../endpoints/Kad.findNode");
const Kad_findProviders_1 = require("../endpoints/Kad.findProviders");
const Kad_get_1 = require("../endpoints/Kad.get");
const Kad_ping_1 = require("../endpoints/Kad.ping");
const Kad_provide_1 = require("../endpoints/Kad.provide");
const Kad_put_1 = require("../endpoints/Kad.put");
const Kad_verify_1 = require("../endpoints/Kad.verify");
const { log } = (0, Logger_1.default)(module);
class ConnectionToKadClient extends net_1.ConnectionToClient {
    constructor(kad, transport) {
        super(transport, ConnectionToKadClient.apiHandlers);
        this.kad = kad;
        this.verifiedPromise = new Resolvable_1.default();
        this.logger = log.createChild(module, { remoteId: transport.remoteId });
        this.handlerMetadata = {
            connection: this,
            kad: this.kad,
            logger: this.logger,
        };
        this.on('response', ({ response, request, metadata }) => {
            this.logger.info(`kad/${request.command} (${request.messageId})`, {
                args: request.args?.[0],
                response: response.data,
                ...metadata,
            });
        });
    }
}
exports.default = ConnectionToKadClient;
ConnectionToKadClient.apiHandlers = new ApiRegistry_1.default([
    Kad_provide_1.default,
    Kad_connect_1.default,
    Kad_findNode_1.default,
    Kad_findProviders_1.default,
    Kad_ping_1.default,
    Kad_verify_1.default,
    Kad_put_1.default,
    Kad_get_1.default,
]).handlersByCommand;
//# sourceMappingURL=ConnectionToKadClient.js.map