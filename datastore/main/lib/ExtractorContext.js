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
var _ExtractorContext_extractorInternal, _ExtractorContext_datastoreInternal, _ExtractorContext_callbacks;
Object.defineProperty(exports, "__esModule", { value: true });
const Extractor_1 = require("./Extractor");
class ExtractorContext {
    constructor(extractorInternal, datastoreInternal, callbacks) {
        _ExtractorContext_extractorInternal.set(this, void 0);
        _ExtractorContext_datastoreInternal.set(this, void 0);
        _ExtractorContext_callbacks.set(this, void 0);
        __classPrivateFieldSet(this, _ExtractorContext_extractorInternal, extractorInternal, "f");
        __classPrivateFieldSet(this, _ExtractorContext_callbacks, callbacks ?? {}, "f");
        __classPrivateFieldGet(this, _ExtractorContext_callbacks, "f").onFunction ??= (_id, _name, options, run) => run(options);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { affiliateId, payment, input, authentication, ...otherOptions } = extractorInternal.options;
        this.extraOptions = otherOptions;
        this.datastoreMetadata = datastoreInternal.metadata;
        this.datastoreAffiliateId = datastoreInternal.affiliateId;
        this.callerAffiliateId = extractorInternal.options.affiliateId;
    }
    get authentication() {
        return __classPrivateFieldGet(this, _ExtractorContext_extractorInternal, "f").options.authentication;
    }
    get payment() {
        return __classPrivateFieldGet(this, _ExtractorContext_extractorInternal, "f").options.payment;
    }
    get input() {
        return __classPrivateFieldGet(this, _ExtractorContext_extractorInternal, "f").input;
    }
    get outputs() {
        return __classPrivateFieldGet(this, _ExtractorContext_extractorInternal, "f").outputs;
    }
    get Output() {
        return __classPrivateFieldGet(this, _ExtractorContext_extractorInternal, "f").Output;
    }
    get schema() {
        return __classPrivateFieldGet(this, _ExtractorContext_extractorInternal, "f").schema;
    }
    fetch(extractorOrTable, options) {
        return this.run(extractorOrTable, options);
    }
    run(extractorOrTable, options) {
        const finalOptions = this.getMergedOptions(options);
        if (extractorOrTable instanceof Extractor_1.default) {
            return __classPrivateFieldGet(this, _ExtractorContext_callbacks, "f").onFunction(-1, extractorOrTable.name, finalOptions, modifiedOptions => extractorOrTable.runInternal(modifiedOptions, __classPrivateFieldGet(this, _ExtractorContext_callbacks, "f")));
        }
        if ('remoteSource' in extractorOrTable) {
            return __classPrivateFieldGet(this, _ExtractorContext_callbacks, "f").onPassthroughTable(extractorOrTable.name, finalOptions, modifiedOptions => extractorOrTable.fetchInternal(modifiedOptions, __classPrivateFieldGet(this, _ExtractorContext_callbacks, "f")));
        }
        return extractorOrTable.runInternal(finalOptions);
    }
    async crawl(crawler, options = {}) {
        const finalOptions = this.getMergedOptions(options);
        const [crawl] = await __classPrivateFieldGet(this, _ExtractorContext_callbacks, "f").onFunction(-1, crawler.name, finalOptions, modifiedOptions => crawler.runInternal(modifiedOptions, __classPrivateFieldGet(this, _ExtractorContext_callbacks, "f")));
        return crawl;
    }
    query(sql, boundValues, options) {
        return __classPrivateFieldGet(this, _ExtractorContext_datastoreInternal, "f").queryInternal(sql, boundValues, options, __classPrivateFieldGet(this, _ExtractorContext_callbacks, "f"));
    }
    getMergedOptions(options) {
        const finalOptions = { ...__classPrivateFieldGet(this, _ExtractorContext_extractorInternal, "f").options, ...options };
        finalOptions.trackMetadata = options.trackMetadata;
        if (options.input) {
            // merge input
            finalOptions.input = { ...__classPrivateFieldGet(this, _ExtractorContext_extractorInternal, "f").input, ...options.input };
        }
        return finalOptions;
    }
}
exports.default = ExtractorContext;
_ExtractorContext_extractorInternal = new WeakMap(), _ExtractorContext_datastoreInternal = new WeakMap(), _ExtractorContext_callbacks = new WeakMap();
//# sourceMappingURL=ExtractorContext.js.map