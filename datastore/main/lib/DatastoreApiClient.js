"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bufferUtils_1 = require("@ulixee/commons/lib/bufferUtils");
const hashUtils_1 = require("@ulixee/commons/lib/hashUtils");
const TypeSerializer_1 = require("@ulixee/commons/lib/TypeSerializer");
const utils_1 = require("@ulixee/commons/lib/utils");
const net_1 = require("@ulixee/net");
const datastore_1 = require("@ulixee/platform-specification/datastore");
const datastoreIdValidation_1 = require("@ulixee/platform-specification/types/datastoreIdValidation");
const semverValidation_1 = require("@ulixee/platform-specification/types/semverValidation");
const ValidationError_1 = require("@ulixee/specification/utils/ValidationError");
const nanoid_1 = require("nanoid");
const installDatastoreSchema_1 = require("../types/installDatastoreSchema");
const CreditsTable_1 = require("./CreditsTable");
const QueryLog_1 = require("./QueryLog");
const ResultIterable_1 = require("./ResultIterable");
class DatastoreApiClient {
    constructor(host, options) {
        this.validateApiParameters = true;
        this.activeStreamByQueryId = new Map();
        this.options = options ?? {};
        this.options.consoleLogErrors ??= false;
        this.options.storeQueryLog ??= process.env.NODE_ENV !== 'test';
        const url = (0, utils_1.toUrl)(host);
        const transport = new net_1.WsTransportToCore(`ws://${url.host}/datastore`);
        this.connectionToCore = new net_1.ConnectionToCore(transport);
        this.connectionToCore.on('event', this.onEvent.bind(this));
        if (this.options.storeQueryLog) {
            this.queryLog = new QueryLog_1.default();
        }
    }
    async disconnect() {
        await Promise.all([this.queryLog?.close(), this.connectionToCore.disconnect()]);
    }
    async getMeta(id, version, includeSchemas = false) {
        return await this.runApi('Datastore.meta', {
            id,
            version,
            includeSchemasAsJson: includeSchemas,
        });
    }
    async getExtractorPricing(id, version, extractorName) {
        const meta = await this.getMeta(id, version);
        const stats = meta.extractorsByName[extractorName];
        return {
            ...stats,
            computePricePerQuery: meta.computePricePerQuery,
        };
    }
    async install(id, version, alias) {
        const meta = await this.getMeta(id, version);
        if (meta.extractorsByName && meta.schemaInterface) {
            (0, installDatastoreSchema_1.default)(meta.schemaInterface, id, version);
        }
        if (alias) {
            (0, installDatastoreSchema_1.addDatastoreAlias)(alias, id, version);
        }
        return meta;
    }
    stream(id, version, name, input, options = {}) {
        const queryId = options?.queryId ?? (0, nanoid_1.nanoid)(12);
        const startDate = new Date();
        const results = new ResultIterable_1.default();
        this.activeStreamByQueryId.set(id, results);
        const onFinalized = options.payment?.onFinalized;
        const query = {
            id,
            version,
            queryId,
            name,
            input,
            payment: options.payment,
            authentication: options.authentication,
            affiliateId: options.affiliateId,
        };
        const host = this.connectionToCore.transport.host;
        const hostIdentity = null; // TODO: exchange identity
        void this.runApi('Datastore.stream', query)
            .then(result => {
            onFinalized?.(result.metadata);
            results.done(result);
            this.queryLog?.log(query, startDate, results.results, result.metadata, host, hostIdentity);
            this.activeStreamByQueryId.delete(id);
            return null;
        })
            .catch(error => {
            onFinalized?.(null, error);
            this.queryLog?.log(query, startDate, null, null, host, hostIdentity, error);
            results.reject(error);
        });
        return results;
    }
    /**
     * NOTE: any caller must handle tracking local balances of Credits and removing them if they're depleted!
     */
    async query(id, version, sql, options = {}) {
        const startDate = new Date();
        const queryId = options.queryId ?? (0, nanoid_1.nanoid)(12);
        const query = {
            id,
            queryId,
            version,
            sql,
            boundValues: options.boundValues ?? [],
            payment: options.payment,
            authentication: options.authentication,
            affiliateId: options.affiliateId,
        };
        const host = this.connectionToCore.transport.host;
        const hostIdentity = null; // TODO: exchange identity
        try {
            const result = await this.runApi('Datastore.query', query);
            if (options.payment?.onFinalized) {
                options.payment.onFinalized(result.metadata);
            }
            this.queryLog?.log(query, startDate, result.outputs, result.metadata, host, hostIdentity);
            return result;
        }
        catch (error) {
            if (options.payment?.onFinalized) {
                options.payment.onFinalized(null, error);
            }
            this.queryLog?.log(query, startDate, null, null, host, hostIdentity, error);
            throw error;
        }
    }
    async upload(compressedDbx, options = {}) {
        options.timeoutMs ??= 120e3;
        const { timeoutMs } = options;
        let adminSignature;
        let adminIdentity;
        if (options.identity) {
            const identity = options.identity;
            adminIdentity = identity.bech32;
            const message = DatastoreApiClient.createUploadSignatureMessage(compressedDbx);
            adminSignature = identity.sign(message);
        }
        else if (options.forwardedSignature) {
            ({ adminIdentity, adminSignature } = options.forwardedSignature);
        }
        const { success } = await this.runApi('Datastore.upload', {
            compressedDbx,
            adminSignature,
            adminIdentity,
        }, timeoutMs);
        return { success };
    }
    async download(id, version, identity, options = {}) {
        options.timeoutMs ??= 120e3;
        const requestDate = new Date();
        const { timeoutMs } = options;
        const adminIdentity = identity.bech32;
        const message = DatastoreApiClient.createDownloadSignatureMessage(id, version, requestDate.getTime());
        const adminSignature = identity.sign(message);
        return await this.runApi('Datastore.download', {
            id,
            version,
            requestDate,
            adminSignature,
            adminIdentity,
        }, timeoutMs);
    }
    async startDatastore(id, dbxPath, watch = false) {
        const { success } = await this.runApi('Datastore.start', {
            id,
            dbxPath,
            watch,
        });
        return { success };
    }
    async getCreditsBalance(id, version, creditId) {
        return await this.runApi('Datastore.creditsBalance', {
            id,
            version,
            creditId,
        });
    }
    async createCredits(id, version, microgons, adminIdentity) {
        return await this.administer(id, version, adminIdentity, {
            ownerType: 'table',
            ownerName: CreditsTable_1.default.tableName,
            functionName: 'create',
        }, [microgons]);
    }
    async administer(id, version, adminIdentity, adminFunction, functionArgs) {
        const message = DatastoreApiClient.createAdminFunctionMessage(id, adminIdentity.bech32, adminFunction.ownerType, adminFunction.ownerName, adminFunction.functionName, functionArgs);
        const adminSignature = adminIdentity.sign(message);
        return await this.runApi('Datastore.admin', {
            id,
            version,
            adminSignature,
            adminFunction,
            adminIdentity: adminIdentity.bech32,
            functionArgs,
        });
    }
    request(command, args, timeoutMs) {
        return this.connectionToCore.sendRequest({ command, args: [args] }, timeoutMs);
    }
    onEvent(evt) {
        const { event } = evt;
        if (event.eventType === 'Stream.output') {
            const data = event.data;
            this.activeStreamByQueryId.get(event.listenerId)?.push(data);
        }
    }
    async runApi(command, args, timeoutMs) {
        try {
            if (this.validateApiParameters) {
                args = await datastore_1.default[command].args.parseAsync(args);
            }
        }
        catch (error) {
            if (this.options.consoleLogErrors) {
                console.error('ERROR running Api', error, {
                    command,
                    args,
                });
            }
            throw ValidationError_1.default.fromZodValidation(`The API parameters for ${command} has some issues`, error);
        }
        return await this.connectionToCore.sendRequest({ command, args: [args] }, timeoutMs);
    }
    static parseDatastoreUrl(url) {
        const datastorePathRegex = new RegExp(`(?:.+://)?([^/]+)/(?:docs/)?(${datastoreIdValidation_1.datastoreRegex.source})@v(${semverValidation_1.semverRegex.source})/?`);
        const match = url.match(datastorePathRegex);
        if (match) {
            const [, host, datastoreId, datastoreVersion] = match;
            return Promise.resolve({ host, datastoreId, datastoreVersion });
        }
    }
    static createExecSignatureMessage(payment, nonce) {
        return (0, hashUtils_1.sha256)((0, bufferUtils_1.concatAsBuffer)('Datastore.exec', payment?.credits?.id, payment?.micronote?.micronoteId, nonce));
    }
    static createExecAuthentication(payment, authenticationIdentity, nonce) {
        nonce ??= (0, nanoid_1.nanoid)(10);
        const message = DatastoreApiClient.createExecSignatureMessage(payment, nonce);
        return {
            identity: authenticationIdentity.bech32,
            signature: authenticationIdentity.sign(message),
            nonce,
        };
    }
    static createAdminFunctionMessage(datastoreId, adminIdentity, ownerType, ownerName, functionName, args) {
        return (0, hashUtils_1.sha256)((0, bufferUtils_1.concatAsBuffer)('Datastore.admin', datastoreId, adminIdentity, ownerType, ownerName, functionName, TypeSerializer_1.default.stringify(args, { sortKeys: true })));
    }
    static createUploadSignatureMessage(compressedDbx) {
        return (0, hashUtils_1.sha256)((0, bufferUtils_1.concatAsBuffer)('Datastore.upload', compressedDbx));
    }
    static createDownloadSignatureMessage(id, version, requestDate) {
        return (0, hashUtils_1.sha256)((0, bufferUtils_1.concatAsBuffer)('Datastore.download', id, version, requestDate));
    }
}
exports.default = DatastoreApiClient;
//# sourceMappingURL=DatastoreApiClient.js.map