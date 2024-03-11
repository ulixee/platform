"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DatastoreApiHandler_1 = require("../lib/DatastoreApiHandler");
const datastoreUtils_1 = require("../lib/datastoreUtils");
const PaymentProcessor_1 = require("../lib/PaymentProcessor");
exports.default = new DatastoreApiHandler_1.default('Datastore.query', {
    async handler(request, context) {
        request.boundValues ??= [];
        const { queryId, affiliateId, payment, authentication, version, id } = request;
        const { pluginCoresByName } = context;
        const startTime = Date.now();
        const manifestWithRuntime = await context.datastoreRegistry.get(id, version);
        const storage = context.storageEngineRegistry.get(manifestWithRuntime, {
            queryId,
            payment,
            authentication,
            id,
            version,
        });
        const datastore = await context.vm.open(manifestWithRuntime.runtimePath, storage, manifestWithRuntime);
        await (0, datastoreUtils_1.validateAuthentication)(datastore, payment, authentication);
        const paymentProcessor = new PaymentProcessor_1.default(payment, datastore, context);
        const heroSessionIds = [];
        const cloudNodeHost = context.cloudNodeAddress.host;
        const cloudNodeIdentity = context.cloudNodeIdentity?.bech32;
        const finalResult = await datastore
            .queryInternal(request.sql, request.boundValues, {
            version,
            id,
            queryId,
            payment,
            authentication,
        }, {
            async beforeAll({ sqlParser, functionCallsById }) {
                if (!sqlParser.isSelect())
                    throw new Error('Invalid SQL command');
                for (const name of sqlParser.tableNames) {
                    const table = datastore.tables[name];
                    if (!table)
                        throw new Error(`There is no table named "${name}" in this datastore.`);
                    if (!table.isPublic)
                        throw new Error(`Table ${name} is not publicly accessible.`);
                }
                await paymentProcessor.createHold(manifestWithRuntime, functionCallsById, request.pricingPreferences);
            },
            async onFunction(callId, name, options, run) {
                const runStart = Date.now();
                (0, datastoreUtils_1.validateFunctionCoreVersions)(manifestWithRuntime, name, context);
                Object.assign(options, {
                    payment,
                    authentication,
                    affiliateId,
                    version,
                    id,
                    queryId,
                });
                options.trackMetadata = (metaName, metaValue) => {
                    if (metaName === 'heroSessionId') {
                        if (!heroSessionIds.includes(metaValue))
                            heroSessionIds.push(metaValue);
                    }
                };
                for (const plugin of Object.values(pluginCoresByName)) {
                    if (plugin.beforeRunExtractor)
                        await plugin.beforeRunExtractor(options, {
                            scriptEntrypoint: manifestWithRuntime.runtimePath,
                            functionName: name,
                        });
                }
                let runError;
                let outputs;
                let bytes = 0;
                let microgons = 0;
                try {
                    outputs = await context.workTracker.trackRun(run(options));
                    // release the hold
                    bytes = PaymentProcessor_1.default.getOfficialBytes(outputs);
                    microgons = paymentProcessor.releaseLocalFunctionHold(callId, bytes);
                }
                catch (error) {
                    runError = error;
                }
                const milliseconds = Date.now() - runStart;
                await context.statsTracker.recordEntityStats({
                    version: request.version,
                    datastoreId: id,
                    entityName: name,
                    bytes,
                    microgons,
                    milliseconds,
                    didUseCredits: !!request.payment?.credits,
                    cloudNodeHost,
                    cloudNodeIdentity,
                    error: runError,
                });
                // Do we need to rollback the stats? We won't finalize payment in this scenario.
                if (runError)
                    throw runError;
                return outputs;
            },
            async onPassthroughTable(name, options, run) {
                Object.assign(options, {
                    payment,
                    authentication,
                    version,
                    id,
                    queryId,
                });
                return await context.workTracker.trackRun(run(options));
            },
        })
            .catch(error => error);
        let outputs;
        let runError;
        if (finalResult instanceof Error) {
            runError = finalResult;
        }
        else {
            outputs = finalResult;
        }
        const resultBytes = outputs ? PaymentProcessor_1.default.getOfficialBytes(outputs) : 0;
        const microgons = await paymentProcessor.settle(resultBytes);
        const metadata = {
            bytes: resultBytes,
            microgons,
            milliseconds: Date.now() - startTime,
        };
        await context.statsTracker.recordQuery({
            queryId,
            query: request.sql,
            startTime,
            input: request.boundValues,
            outputs,
            version,
            datastoreId: id,
            ...metadata,
            micronoteId: payment?.micronote?.micronoteId,
            creditId: payment?.credits?.id,
            affiliateId,
            error: runError,
            heroSessionIds,
            cloudNodeHost,
            cloudNodeIdentity,
        });
        // TODO: should we return this to client so that the rest of the metadata is visible?
        if (runError)
            throw runError;
        return {
            outputs,
            latestVersion: manifestWithRuntime.latestVersion,
            metadata,
        };
    },
});
//# sourceMappingURL=Datastore.query.js.map