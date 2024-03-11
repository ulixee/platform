"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAuthentication = exports.validateFunctionCoreVersions = void 0;
const VersionUtils_1 = require("@ulixee/commons/lib/VersionUtils");
const Identity_1 = require("@ulixee/crypto/lib/Identity");
const DatastoreApiClient_1 = require("@ulixee/datastore/lib/DatastoreApiClient");
function validateFunctionCoreVersions(registryEntry, extractorName, context) {
    if (!registryEntry.extractorsByName[extractorName] && !registryEntry.crawlersByName[extractorName])
        throw new Error(`${extractorName} is not a valid function name for this Datastore`);
    const { corePlugins } = registryEntry.extractorsByName[extractorName] ?? registryEntry.crawlersByName[extractorName] ?? {};
    for (const [pluginName, pluginVersion] of Object.entries(corePlugins ?? {})) {
        const pluginCore = context.pluginCoresByName[pluginName];
        if (!pluginCore) {
            throw new Error(`This Cloud does not support required runtime dependency: ${pluginName}`);
        }
        if (!(0, VersionUtils_1.isSemverSatisfied)(pluginVersion, pluginCore.version)) {
            throw new Error(`The current version of ${pluginName} (${pluginVersion}) is incompatible with this Datastore version (${pluginVersion})`);
        }
    }
}
exports.validateFunctionCoreVersions = validateFunctionCoreVersions;
async function validateAuthentication(datastore, payment, authentication) {
    if (!datastore.authenticateIdentity)
        return;
    const isValid = await datastore.authenticateIdentity(authentication?.identity, authentication?.nonce);
    if (isValid !== true)
        throw new Error(`The supplied authentication was rejected by this Datastore. ${JSON.stringify(authentication) ?? '(nothing supplied)'}`);
    // if callback didn't reject lack of identity, allow it
    if (isValid && !authentication)
        return;
    const { nonce, identity, signature } = authentication;
    const message = DatastoreApiClient_1.default.createExecSignatureMessage(payment, nonce);
    if (!Identity_1.default.verify(identity, message, signature)) {
        throw new Error('The provided Datastore.query authentication signature is invalid.');
    }
}
exports.validateAuthentication = validateAuthentication;
//# sourceMappingURL=datastoreUtils.js.map