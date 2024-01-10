"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _ClientForRemote_apiClient;
Object.defineProperty(exports, "__esModule", { value: true });
const DatastoreApiClient_1 = require("@ulixee/datastore/lib/DatastoreApiClient");
const ClientForDatastore_1 = require("./ClientForDatastore");
const ClientForExtractor_1 = require("./ClientForExtractor");
const ClientForTable_1 = require("./ClientForTable");
const ClientForCrawler_1 = require("./ClientForCrawler");
const ConnectionParameters_1 = require("./ConnectionParameters");
class ClientForRemote {
    constructor(uriOrObject = {}) {
        _ClientForRemote_apiClient.set(this, void 0);
        const connectionParameters = new ConnectionParameters_1.default(uriOrObject);
        this.user = connectionParameters.user;
        if (connectionParameters.database) {
            this.database = connectionParameters.database;
            const [datastoreId, version] = this.database.split('@v');
            this.datastoreId = datastoreId;
            this.version = version;
        }
        this.port = connectionParameters.port;
        this.host = connectionParameters.host;
        this.password = connectionParameters.password;
    }
    get apiClient() {
        if (!__classPrivateFieldGet(this, _ClientForRemote_apiClient, "f")) {
            const address = `${this.host}:${this.port}`;
            __classPrivateFieldSet(this, _ClientForRemote_apiClient, new DatastoreApiClient_1.default(address), "f");
        }
        return __classPrivateFieldGet(this, _ClientForRemote_apiClient, "f");
    }
    async run(extractorOrTableName, inputFilter) {
        return await this.fetch(extractorOrTableName, inputFilter);
    }
    async fetch(extractorOrTableName, inputFilter) {
        if (!this.database) {
            throw new Error('You Client connection must specific a datastore to fetch');
        }
        const options = {
            payment: this.user
                ? {
                    credits: {
                        id: this.user,
                        secret: this.password,
                    },
                }
                : undefined,
        };
        return (await this.apiClient.stream(this.datastoreId, this.version, extractorOrTableName, inputFilter, options));
    }
    async crawl(name, inputFilter) {
        if (!this.database) {
            throw new Error('You Client connection must specific a datastore to crawl');
        }
        const options = {
            payment: this.user
                ? {
                    credits: {
                        id: this.user,
                        secret: this.password,
                    },
                }
                : undefined,
        };
        const [crawlerOutput] = await this.apiClient.stream(this.datastoreId, this.version, name, inputFilter, options);
        return crawlerOutput;
    }
    async query(sql, boundValues = []) {
        if (!this.database) {
            throw new Error('You Client connection must specific a datastore to query');
        }
        const options = {
            boundValues,
            payment: this.user
                ? {
                    credits: {
                        id: this.user,
                        secret: this.password,
                    },
                }
                : undefined,
        };
        const { outputs } = await this.apiClient.query(this.datastoreId, this.version, sql, options);
        return outputs;
    }
    disconnect() {
        return __classPrivateFieldGet(this, _ClientForRemote_apiClient, "f")?.disconnect();
    }
    static forDatastore(datastore, options) {
        return new ClientForDatastore_1.default(datastore, options);
    }
    static forTable(table, options) {
        return new ClientForTable_1.default(table, options);
    }
    static forExtractor(extractor, options) {
        return new ClientForExtractor_1.default(extractor, options);
    }
    static forCrawler(datastore, options) {
        return new ClientForCrawler_1.default(datastore, options);
    }
}
exports.default = ClientForRemote;
_ClientForRemote_apiClient = new WeakMap();
//# sourceMappingURL=Client.js.map