"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const envUtils_1 = require("@ulixee/commons/lib/envUtils");
const Identity_1 = require("@ulixee/platform-utils/lib/Identity");
(0, envUtils_1.loadEnv)(process.cwd());
(0, envUtils_1.loadEnv)(__dirname);
const env = process.env;
if (env.ULX_NETWORK_IDENTITY_PATH)
    env.ULX_NETWORK_IDENTITY_PATH = (0, envUtils_1.parseEnvPath)(env.ULX_NETWORK_IDENTITY_PATH);
exports.default = {
    disableChromeAlive: env.NODE_ENV === 'test' || (0, envUtils_1.parseEnvBool)(env.ULX_DISABLE_CHROMEALIVE),
    servicesSetupHost: env.ULX_SERVICES_SETUP_HOST,
    nodeRegistryHost: env.ULX_NODE_REGISTRY_HOST,
    networkIdentity: env.ULX_NETWORK_IDENTITY_PATH
        ? Identity_1.default.loadFromFile(env.ULX_NETWORK_IDENTITY_PATH, {
            keyPassphrase: env.ULX_NETWORK_IDENTITY_PASSPHRASE,
        })
        : null,
    publicPort: env.ULX_PORT ?? env.PORT,
    publicHostname: env.ULX_HOSTNAME,
    hostedServicesPort: env.ULX_HOSTED_SERVICES_PORT,
    hostedServicesHostname: env.ULX_HOSTED_SERVICES_HOSTNAME,
};
//# sourceMappingURL=env.js.map