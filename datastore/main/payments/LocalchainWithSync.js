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
const localchain_1 = require("@ulixee/localchain");
const objectUtils_1 = require("@ulixee/platform-utils/lib/objectUtils");
const Path = require("node:path");
const env_1 = require("../env");
const DatastoreLookup_1 = require("../lib/DatastoreLookup");
const DefaultPaymentService_1 = require("./DefaultPaymentService");
const { log } = (0, Logger_1.default)(module);
if (env_1.default.defaultDataDir) {
    localchain_1.Localchain.setDefaultDir(Path.join(env_1.default.defaultDataDir, 'ulixee', 'localchain'));
}
class LocalchainWithSync extends eventUtils_1.TypedEventEmitter {
    get dataDomains() {
        return __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").dataDomains;
    }
    get openEscrows() {
        return __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").openEscrows;
    }
    get balanceSync() {
        return __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").balanceSync;
    }
    get transactions() {
        return __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").transactions;
    }
    get mainchainTransfers() {
        return __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").mainchainTransfers;
    }
    get inner() {
        return __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f");
    }
    constructor(localchainConfig = {}) {
        super();
        this.localchainConfig = localchainConfig;
        _LocalchainWithSync_localchain.set(this, void 0);
        this.enableLogging = true;
    }
    async load() {
        const { mainchainUrl, localchainPath } = this.localchainConfig;
        let defaultPath = localchainPath ?? localchain_1.Localchain.getDefaultPath();
        if (!defaultPath.endsWith('.db')) {
            defaultPath = Path.join(defaultPath, 'primary.db');
        }
        log.info(`Loading ${mainchainUrl ? 'online' : 'offline'} localchain`, {
            localchainPath: defaultPath,
        });
        const keystorePassword = this.getPassword();
        if (mainchainUrl) {
            __classPrivateFieldSet(this, _LocalchainWithSync_localchain, await localchain_1.Localchain.load({
                path: localchainPath,
                mainchainUrl,
                keystorePassword,
            }), "f");
            this.datastoreLookup = new DatastoreLookup_1.default(await __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").mainchainClient);
        }
        else {
            __classPrivateFieldSet(this, _LocalchainWithSync_localchain, await localchain_1.Localchain.loadWithoutMainchain(defaultPath, {
                genesisUtcTime: env_1.default.genesisUtcTime,
                tickDurationMillis: env_1.default.tickDurationMillis,
                ntpPoolUrl: env_1.default.ntpPoolUrl,
            }, keystorePassword), "f");
        }
        this.afterLoad();
    }
    async close() {
        clearTimeout(this.nextTick);
        this.datastoreLookup = null;
        await __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f")?.close();
        __classPrivateFieldSet(this, _LocalchainWithSync_localchain, null, "f");
    }
    async connectToMainchain(mainchainUrl, timeoutMs = 10e3) {
        const mainchain = await localchain_1.MainchainClient.connect(mainchainUrl, timeoutMs);
        await __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").attachMainchain(mainchain);
    }
    async getAccountOverview() {
        return await __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").accountOverview();
    }
    timeForTick(tick) {
        return new Date(Number(__classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").ticker.timeForTick(tick)));
    }
    async createPaymentService(datastoreClients) {
        return await DefaultPaymentService_1.default.fromLocalchain(this, this.localchainConfig.escrowAllocationStrategy, datastoreClients);
    }
    getPassword() {
        let keystorePassword = this.localchainConfig.keystorePassword;
        if (keystorePassword &&
            !keystorePassword.password &&
            !keystorePassword.passwordFile &&
            !keystorePassword.interactiveCli) {
            keystorePassword = undefined;
        }
        return keystorePassword;
    }
    afterLoad() {
        const { keystorePassword } = this.localchainConfig;
        this.address = __classPrivateFieldGet(this, _LocalchainWithSync_localchain, "f").address.catch(() => null);
        // remove password from memory
        if (Buffer.isBuffer(keystorePassword?.password)) {
            keystorePassword.password.fill(0);
            delete keystorePassword.password;
        }
        if (this.localchainConfig.automaticallyRunSync !== false)
            this.scheduleNextTick();
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
    static async load(config) {
        const localchain = new LocalchainWithSync(config);
        await localchain.load();
        return localchain;
    }
}
_LocalchainWithSync_localchain = new WeakMap();
exports.default = LocalchainWithSync;
//# sourceMappingURL=LocalchainWithSync.js.map