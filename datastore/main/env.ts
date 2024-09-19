import { loadEnv, parseEnvInt } from '@ulixee/commons/lib/envUtils';

loadEnv(process.cwd());
loadEnv(__dirname);
const env = process.env;

export default {
  argonMainchainUrl: env.ARGON_MAINCHAIN_URL,
  genesisUtcTime: parseEnvInt(env.ARGON_GENESIS_UTC_TIME),
  tickDurationMillis: parseEnvInt(env.ARGON_TICK_DURATION_MILLIS),
  escrowExpirationTicks: parseEnvInt(env.ARGON_ESCROW_EXPIRATION_TICKS),
  ntpPoolUrl: env.ARGON_NTP_SERVER,
  defaultDataDir: env.ULX_DATA_DIR,
};
