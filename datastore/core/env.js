"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIdentities = void 0;
const envUtils_1 = require("@ulixee/commons/lib/envUtils");
const Identity_1 = require("@ulixee/crypto/lib/Identity");
const common_1 = require("@ulixee/specification/common");
(0, envUtils_1.loadEnv)(process.cwd());
(0, envUtils_1.loadEnv)(__dirname);
const env = process.env;
if (env.ULX_DATASTORE_DIR)
    env.ULX_DATASTORE_DIR = (0, envUtils_1.parseEnvPath)(env.ULX_DATASTORE_DIR);
if (env.ULX_QUERY_HERO_SESSIONS_DIR)
    env.ULX_QUERY_HERO_SESSIONS_DIR = (0, envUtils_1.parseEnvPath)(env.ULX_QUERY_HERO_SESSIONS_DIR);
if (env.ULX_IDENTITY_PATH)
    env.ULX_IDENTITY_PATH = (0, envUtils_1.parseEnvPath)(env.ULX_IDENTITY_PATH);
exports.default = {
    serverEnvironment: env.ULX_SERVER_ENVIRONMENT,
    datastoresDir: env.ULX_DATASTORE_DIR,
    queryHeroSessionsDir: env.ULX_QUERY_HERO_SESSIONS_DIR,
    replayRegistryHost: env.ULX_REPLAY_REGISTRY_HOST,
    enableSqliteWalMode: env.ULX_ENABLE_SQLITE_WAL,
    // list of identities who can upload to this Cloud [@ulixee/crypto/lib/Identity.bech32]
    cloudAdminIdentities: parseIdentities(env.ULX_CLOUD_ADMIN_IDENTITIES, 'Admin Identities'),
    datastoresMustHaveOwnAdminIdentity: (0, envUtils_1.parseEnvBool)(env.ULX_DATASTORES_MUST_HAVE_OWN_ADMIN) ?? false,
    paymentAddress: parseAddress(env.ULX_PAYMENT_ADDRESS),
    computePricePerQuery: (0, envUtils_1.parseEnvInt)(env.ULX_PRICE_PER_QUERY),
    approvedSidechains: [],
    defaultSidechainHost: env.ULX_SIDECHAIN_HOST,
    defaultSidechainRootIdentity: env.ULX_SIDECHAIN_IDENTITY,
    identityWithSidechain: loadIdentity(env.ULX_IDENTITY_PEM, env.ULX_IDENTITY_PATH, env.ULX_IDENTITY_PASSPHRASE),
    enableGlobalConfigs: (0, envUtils_1.parseEnvBool)(env.ULX_ENABLE_GLOBAL_CONFIG) ?? true,
    statsTrackerHost: env.ULX_DATASTORE_STATS_HOST,
    datastoreRegistryHost: env.ULX_DATASTORE_REGISTRY_HOST,
    storageEngineHost: env.ULX_STORAGE_ENGINE_HOST,
};
function loadIdentity(identityPEM, path, keyPassphrase) {
    if (identityPEM) {
        return Identity_1.default.loadFromPem(identityPEM, { keyPassphrase });
    }
    if (!path)
        return null;
    return Identity_1.default.loadFromFile(path, { keyPassphrase });
}
function parseIdentity(identity, type) {
    if (!identity)
        return identity;
    try {
        common_1.identityValidation.parse(identity);
        return identity;
    }
    catch (error) {
        throw new Error(`Invalid Identity "${identity}" provided to the ${type} environment variable. (Identities are Bech32m encoded and start with "id1").`);
    }
}
function parseIdentities(identities, type) {
    if (!identities)
        return [];
    const identityList = identities
        .split(',')
        .map(x => x.trim())
        .filter(Boolean);
    for (const identity of identityList) {
        parseIdentity(identity, type);
    }
    return identityList;
}
exports.parseIdentities = parseIdentities;
function parseAddress(address) {
    if (!address)
        return null;
    address = address.trim();
    try {
        common_1.addressValidation.parse(address);
    }
    catch (error) {
        throw new Error(`Invalid Payment Address "${address}" provided. (Addresses are Bech32m encoded and start with "ar1").`);
    }
    return address;
}
//# sourceMappingURL=env.js.map