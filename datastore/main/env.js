"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const envUtils_1 = require("@ulixee/commons/lib/envUtils");
(0, envUtils_1.loadEnv)(process.cwd());
(0, envUtils_1.loadEnv)(__dirname);
const env = process.env;
exports.default = {
    mainchainUrl: env.ULX_MAINCHAIN_URL,
    genesisUtcTime: (0, envUtils_1.parseEnvInt)(env.ULX_GENESIS_UTC_TIME),
    tickDurationMillis: (0, envUtils_1.parseEnvInt)(env.ULX_TICK_DURATION_MILLIS),
    ntpPoolUrl: env.ULX_NTP_SERVER,
    defaultDataDir: env.ULX_DATA_DIR,
};
//# sourceMappingURL=env.js.map