"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Datastore_datastoreInternal;
Object.defineProperty(exports, "__esModule", { value: true });
const addGlobalInstance_1 = require("@ulixee/commons/lib/addGlobalInstance");
const DatastoreInternal_1 = require("./DatastoreInternal");
class Datastore {
    constructor(components, datastoreInternal) {
        _Datastore_datastoreInternal.set(this, void 0);
        __classPrivateFieldSet(this, _Datastore_datastoreInternal, datastoreInternal ?? new DatastoreInternal_1.default(components), "f");
    }
    get affiliateId() {
        return __classPrivateFieldGet(this, _Datastore_datastoreInternal, "f").affiliateId;
    }
    get metadata() {
        return __classPrivateFieldGet(this, _Datastore_datastoreInternal, "f").metadata;
    }
    get extractors() {
        return __classPrivateFieldGet(this, _Datastore_datastoreInternal, "f").extractors;
    }
    get tables() {
        return __classPrivateFieldGet(this, _Datastore_datastoreInternal, "f").tables;
    }
    get crawlers() {
        return __classPrivateFieldGet(this, _Datastore_datastoreInternal, "f").crawlers;
    }
    get authenticateIdentity() {
        return __classPrivateFieldGet(this, _Datastore_datastoreInternal, "f").components.authenticateIdentity;
    }
    get onCreated() {
        return __classPrivateFieldGet(this, _Datastore_datastoreInternal, "f").components.onCreated;
    }
    get onVersionMigrated() {
        return __classPrivateFieldGet(this, _Datastore_datastoreInternal, "f").components.onVersionMigrated;
    }
    queryInternal(sql, boundValues, options, callbacks = {}) {
        return __classPrivateFieldGet(this, _Datastore_datastoreInternal, "f").queryInternal(sql, boundValues, options, callbacks);
    }
    bind(config) {
        return __classPrivateFieldGet(this, _Datastore_datastoreInternal, "f").bind(config);
    }
}
exports.default = Datastore;
_Datastore_datastoreInternal = new WeakMap();
(0, addGlobalInstance_1.default)(Datastore);
//# sourceMappingURL=Datastore.js.map