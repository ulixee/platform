import { loadEnv, parseEnvInt } from '@ulixee/commons/lib/envUtils';

loadEnv(process.cwd());
loadEnv(__dirname);
const env = process.env;

export default {
  mainchainUrl: env.ULX_MAINCHAIN_URL,
  genesisUtcTime: parseEnvInt(env.ULX_GENESIS_UTC_TIME),
  tickDurationMillis: parseEnvInt(env.ULX_TICK_DURATION_MILLIS),
  ntpPoolUrl: env.ULX_NTP_SERVER,
  defaultDataDir: env.ULX_DATA_DIR,
};
