"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PaymentProcessor_1 = require("../lib/PaymentProcessor");
const datastoreUtils_1 = require("../lib/datastoreUtils");
const DatastoreApiHandler_1 = require("../lib/DatastoreApiHandler");
exports.default = new DatastoreApiHandler_1.default('Datastore.queryStorageEngine', {
    async handler(request, context) {
        request.boundValues ??= [];
        const { id, payment, authentication, version, queryId } = request;
        const startTime = Date.now();
        const manifestWithEntrypoint = await context.datastoreRegistry.get(id, version);
        const storage = context.storageEngineRegistry.get(manifestWithEntrypoint, {
            id,
            version,
            payment,
            authentication,
            queryId,
        });
        const datastore = await context.vm.open(manifestWithEntrypoint.runtimePath, storage, manifestWithEntrypoint);
        await (0, datastoreUtils_1.validateAuthentication)(datastore, payment, authentication);
        const paymentProcessor = new PaymentProcessor_1.default(payment, datastore, context);
        let outputs;
        let runError;
        try {
            outputs = await storage.query(request.sql, request.boundValues, { id, version, payment, authentication, queryId }, request.virtualEntitiesByName);
        }
        catch (error) {
            runError = error;
        }
        const resultBytes = outputs ? PaymentProcessor_1.default.getOfficialBytes(outputs) : 0;
        const microgons = await paymentProcessor.settle(resultBytes);
        const metadata = {
            bytes: resultBytes,
            microgons,
            milliseconds: Date.now() - startTime,
        };
        if (runError)
            throw runError;
        return {
            outputs,
            metadata,
        };
    },
});
//# sourceMappingURL=Datastore.queryStorageEngine.js.map