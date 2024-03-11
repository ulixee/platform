"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const Extractor_1 = require("./Extractor");
const ResultIterable_1 = require("./ResultIterable");
class PassthroughExtractor extends Extractor_1.default {
    constructor(components, ...plugins) {
        super({ ...components }, ...plugins);
        this.components.run = this.run.bind(this);
        this.pricePerQuery = components.upcharge ?? 0;
        this.minimumPrice = components.upcharge ?? 0;
        assert(components.remoteExtractor, 'A remote extractor name is required');
        assert(components.remoteExtractor.includes('.'), 'A remote function source is required');
        this.passThroughComponents = components;
        const [source, remoteExtractor] = components.remoteExtractor.split('.');
        this.remoteExtractor = remoteExtractor;
        this.remoteSource = source;
    }
    async run(context) {
        this.createApiClient(context);
        if (this.passThroughComponents.onRequest) {
            await this.passThroughComponents.onRequest(context);
        }
        const payment = { ...(context.payment ?? {}) };
        const embeddedCredit = context.datastoreMetadata.remoteDatastoreEmbeddedCredits[this.remoteSource];
        if (embeddedCredit && payment.credits) {
            payment.credits = embeddedCredit;
        }
        else {
            // don't want to pass through credit secrets
            delete payment.credits;
        }
        const queryResult = this.upstreamClient.stream(this.remoteDatastoreId, this.remoteVersion, this.remoteExtractor, context.input, {
            payment,
            authentication: context.authentication,
            affiliateId: context.datastoreAffiliateId,
        });
        if (this.passThroughComponents.onResponse) {
            const secondPassResults = new ResultIterable_1.default();
            const responseContext = context;
            responseContext.stream = secondPassResults;
            const onResponsePromiseOrError = this.passThroughComponents
                .onResponse(responseContext)
                .catch(err => err);
            try {
                for await (const result of queryResult) {
                    secondPassResults.push(result);
                }
                secondPassResults.done();
            }
            catch (error) {
                secondPassResults.reject(error);
            }
            const response = await onResponsePromiseOrError;
            if (response instanceof Error)
                throw response;
        }
        else {
            for await (const result of queryResult) {
                context.Output.emit(result);
            }
        }
        const finalResult = await queryResult.resultMetadata;
        if (finalResult instanceof Error)
            throw finalResult;
        if (finalResult.latestVersion !== this.remoteVersion) {
            console.warn('Newer Datastore Version is available', {
                newVersion: finalResult.latestVersion,
                usingVersion: this.remoteVersion,
                host: this.passThroughComponents.remoteExtractor,
            });
        }
    }
    createApiClient(context) {
        if (this.upstreamClient)
            return;
        const remoteSource = this.remoteSource;
        // need lookup
        const remoteDatastore = context.datastoreMetadata.remoteDatastores[remoteSource];
        assert(remoteDatastore, `A remote datastore source could not be found for ${remoteSource}`);
        try {
            const [datastoreId, datastoreVersion] = remoteDatastore.split('/').pop().split('@v');
            this.remoteDatastoreId = datastoreId;
            this.remoteVersion = datastoreVersion;
            this.upstreamClient = this.datastoreInternal.createApiClient(remoteDatastore);
        }
        catch (error) {
            throw new Error('A valid url was not supplied for this remote datastore. Format should be ulx://<host>/<datastoreID>@v<datastoreVersion>');
        }
    }
}
exports.default = PassthroughExtractor;
//# sourceMappingURL=PassthroughExtractor.js.map