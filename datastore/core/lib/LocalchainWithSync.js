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
var _LocalchainWithSync_localchain;
Object.defineProperty(exports, "__esModule", { value: true });
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
const Logger_1 = require("@ulixee/commons/lib/Logger");
const DatastoreLookup_1 = require("@ulixee/datastore/lib/DatastoreLookup");
const LocalchainPaymentService_1 = require("@ulixee/datastore/payments/LocalchainPaymentService");
const localchain_1 = require("@ulixee/localchain");
const objectUtils_1 = require("@ulixee/platform-utils/lib/objectUtils");
const { log } = (0, Logger_1.default)(module);
class LocalchainWithSync extends eventUtils_1.TypedEventEmitter {
    get dataDomains() {
        return __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").dataDomains;
    }
    get openEscrows() {
        return __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").openEscrows;
    }
    constructor(localchainConfig) {
        super();
        this.localchainConfig = localchainConfig;
        _LocalchainWithSync_localchain.set(this, void 0);
        this.enableLogging = true;
    }
    async load() {
        const { mainchainUrl, localchainPath, keystorePassword } = this.localchainConfig ?? {};
        __classPrivateFieldSet(this, _LocalchainWithSync_localchain, await localchain_1.Localchain.load({
            path: localchainPath,
            mainchainUrl,
            keystorePassword,
        }), "f");
        this.address = __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").address.catch(() => null);
        // remove password from memory
        if (Buffer.isBuffer(keystorePassword?.password)) {
            keystorePassword.password.fill(0);
            delete keystorePassword.password;
        }
        this.datastoreLookup = new DatastoreLookup_1.default(await __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").mainchainClient);
        this.scheduleNextTick();
    }
    timeForTick(tick) {
        return new Date(Number(__classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").ticker.timeForTick(tick)));
    }
    createPaymentService(datastoreClients) {
        return new LocalchainPaymentService_1.default(__classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f"), {
            escrowMilligonsStrategy: this.localchainConfig.upstreamEscrowMilligonsStrategy ?? {
                type: 'multiplier',
                queries: 100,
            },
        }, datastoreClients);
    }
    scheduleNextTick() {
        clearTimeout(this.nextTick);
        this.nextTick = setTimeout(async () => {
            try {
                const result = await __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").balanceSync.sync({
                    votesAddress: this.localchainConfig.votesAddress,
                });
                this.emit('sync', result);
                if (this.enableLogging) {
                    log.info('Escrow Manager Sync result', {
                        // have to weirdly jsonify
                        balanceChanges: await Promise.all(result.balanceChanges.map(objectUtils_1.gettersToObject)),
                        notarizations: await Promise.all(result.escrowNotarizations.map(objectUtils_1.gettersToObject)),
                    });
                }
            }
            catch (error) {
                log.error('Error synching escrow balance changes', { error });
            }
        }, Number(__classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").ticker.millisToNextTick()));
    }
}
_LocalchainWithSync_localchain = new WeakMap();
exports.default = LocalchainWithSync;
//# sourceMappingURL=LocalchainWithSync.js.map