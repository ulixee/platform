"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DatastoreApiHandler_1 = require("../lib/DatastoreApiHandler");
const PaymentProcessor_1 = require("../lib/PaymentProcessor");
const datastoreUtils_1 = require("../lib/datastoreUtils");
exports.default = new DatastoreApiHandler_1.default('Datastore.stream', {
    async handler(request, context) {
        const startTime = Date.now();
        const { authentication, payment, id, version, queryId } = request;
        const manifestWithRuntime = await context.datastoreRegistry.get(id, version);
        const storage = context.storageEngineRegistry.get(manifestWithRuntime, {
            authentication,
            payment,
            queryId,
            id,
            version,
        });
        const datastore = await context.vm.open(manifestWithRuntime.runtimePath, storage, manifestWithRuntime);
        await (0, datastoreUtils_1.validateAuthentication)(datastore, payment, authentication);
        const paymentProcessor = new PaymentProcessor_1.default(payment, datastore, context);
        const heroSessionIds = [];
        let outputs;
        let bytes = 0;
        let runError;
        let microgons = 0;
        const didUseCredits = !!payment?.credits;
        const requestDetailsForStats = {
            datastoreId: id,
            version,
            queryId,
            input: request.input,
            micronoteId: payment?.micronote?.micronoteId,
            creditId: payment?.credits?.id,
            affiliateId: request.affiliateId,
            didUseCredits,
        };
        const datastoreFunction = datastore.metadata.extractorsByName[request.name] ??
            datastore.metadata.crawlersByName[request.name];
        const datastoreTable = datastore.metadata.tablesByName[request.name];
        const cloudNodeHost = context.cloudNodeAddress.host;
        const cloudNodeIdentity = context.cloudNodeIdentity?.bech32;
        try {
            await paymentProcessor.createHold(manifestWithRuntime, [{ name: request.name, id: 1 }], request.pricingPreferences);
        }
        catch (error) {
            runError = error;
            await context.statsTracker.recordQuery({
                ...requestDetailsForStats,
                query: `stream(${request.name})`,
                startTime,
                outputs,
                milliseconds: Date.now() - startTime,
                microgons,
                bytes,
                error: runError,
                cloudNodeHost,
                cloudNodeIdentity,
            });
            throw runError;
        }
        try {
            if (datastoreFunction) {
                outputs = await extractFunctionOutputs(manifestWithRuntime, datastore, request, context, heroSessionIds);
            }
            else if (datastoreTable) {
                outputs = extractTableOutputs(datastore, request, context);
            }
            else {
                throw new Error(`${request.name} is not a valid Extractor name for this Datastore.`);
            }
            bytes = PaymentProcessor_1.default.getOfficialBytes(outputs);
            microgons = await paymentProcessor.settle(bytes);
        }
        catch (error) {
            runError = error;
        }
        const milliseconds = Date.now() - startTime;
        const resultStats = {
            bytes,
            microgons,
            milliseconds,
        };
        await context.statsTracker.recordEntityStats({
            ...requestDetailsForStats,
            entityName: request.name,
            ...resultStats,
            error: runError,
            cloudNodeHost,
            cloudNodeIdentity,
        });
        await context.statsTracker.recordQuery({
            ...resultStats,
            ...requestDetailsForStats,
            query: `stream(${request.name})`,
            startTime,
            outputs,
            error: runError,
            heroSessionIds,
            cloudNodeHost,
            cloudNodeIdentity,
        });
        if (runError)
            throw runError;
        return {
            latestVersion: manifestWithRuntime.latestVersion,
            metadata: {
                bytes,
                microgons,
                milliseconds,
            },
        };
    },
});
async function extractFunctionOutputs(manifestWithRuntime, datastore, request, context, heroSessionIds) {
    const { pluginCoresByName } = context;
    const cloudNodeHost = context.cloudNodeAddress.host;
    const cloudNodeIdentity = context.cloudNodeIdentity?.bech32;
    (0, datastoreUtils_1.validateFunctionCoreVersions)(manifestWithRuntime, request.name, context);
    const options = {
        input: request.input,
        authentication: request.authentication,
        affiliateId: request.affiliateId,
        payment: request.payment,
    };
    options.trackMetadata = (metaName, metaValue) => {
        if (metaName === 'heroSessionId') {
            if (!heroSessionIds.includes(metaValue))
                heroSessionIds.push(metaValue);
        }
    };
    return await context.workTracker.trackRun((async () => {
        for (const plugin of Object.values(pluginCoresByName)) {
            if (plugin.beforeRunExtractor) {
                await plugin.beforeRunExtractor(options, {
                    scriptEntrypoint: manifestWithRuntime.runtimePath,
                    functionName: request.name,
                });
            }
        }
        const func = datastore.extractors[request.name] ?? datastore.crawlers[request.name];
        const results = func.runInternal(options, {
            async onFunction(id, name, initialOptions, run) {
                const runStart = Date.now();
                let runError;
                let outputs;
                let bytes = 0;
                const microgons = 0;
                try {
                    outputs = await context.workTracker.trackRun(run(options));
                    // release the hold
                    bytes = PaymentProcessor_1.default.getOfficialBytes(outputs);
                }
                catch (error) {
                    runError = error;
                }
                const milliseconds = Date.now() - runStart;
                await context.statsTracker.recordEntityStats({
                    version: request.version,
                    datastoreId: request.id,
                    entityName: name,
                    bytes,
                    microgons,
                    milliseconds,
                    didUseCredits: !!request.payment?.credits,
                    error: runError,
                    cloudNodeHost,
                    cloudNodeIdentity,
                });
                if (runError instanceof Error)
                    throw runError;
                return outputs;
            },
        });
        for await (const result of results) {
            context.connectionToClient.sendEvent({
                listenerId: request.id,
                data: result,
                eventType: 'Stream.output',
            });
        }
        return results;
    })());
}
async function extractTableOutputs(datastore, request, context) {
    const records = await datastore.tables[request.name].fetchInternal({ input: request.input });
    for (const result of records) {
        context.connectionToClient.sendEvent({
            listenerId: request.id,
            data: result,
            eventType: 'Stream.output',
        });
    }
    return records;
}
//# sourceMappingURL=Datastore.stream.js.map