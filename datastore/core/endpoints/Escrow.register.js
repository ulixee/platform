"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EscrowApis_1 = require("@ulixee/platform-specification/datastore/EscrowApis");
const ValidatingApiHandler_1 = require("@ulixee/platform-specification/utils/ValidatingApiHandler");
exports.default = new ValidatingApiHandler_1.default('Escrow.register', EscrowApis_1.EscrowApisSchema, {
    async handler(request, context) {
        const manifest = await context.datastoreRegistry.get(request.datastoreId);
        if (!manifest)
            throw new Error(`Unknown datastore requested ${request.datastoreId}`);
        await context.escrowSpendTracker.importEscrow(request, manifest);
        return { accepted: true };
    },
});
//# sourceMappingURL=Escrow.register.js.map