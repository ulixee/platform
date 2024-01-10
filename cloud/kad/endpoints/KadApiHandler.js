"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const KadApis_1 = require("@ulixee/platform-specification/cloud/KadApis");
const ValidatingApiHandler_1 = require("@ulixee/specification/utils/ValidatingApiHandler");
class KadApiHandler extends ValidatingApiHandler_1.default {
    constructor(command, args) {
        super(command, KadApis_1.KadApiSchemas, args);
        this.apiHandler = args.handler.bind(this);
    }
    async handler(rawArgs, options) {
        if (options.connection?.nodeInfo) {
            options.kad.peerStore.sawNode(options.connection.nodeInfo.nodeId);
        }
        if (this.command !== 'Kad.connect' &&
            this.command !== 'Kad.verify' &&
            !options.connection.verifiedPromise.isResolved) {
            options.logger.warn('Kad API called before verify. Waiting to verify before proceeding', {
                command: this.command,
            });
            await options.connection.verifiedPromise;
        }
        return super.handler(rawArgs, options);
    }
}
exports.default = KadApiHandler;
//# sourceMappingURL=KadApiHandler.js.map