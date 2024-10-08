import UlixeeConfig from '@ulixee/commons/config';
import { loadEnv, parseEnvInt } from '@ulixee/commons/lib/envUtils';

loadEnv(process.cwd());
loadEnv(UlixeeConfig.global.directoryPath);
loadEnv(__dirname);
const env = process.env;

export default {
  argonMainchainUrl: env.ARGON_MAINCHAIN_URL,
  genesisUtcTime: parseEnvInt(env.ARGON_GENESIS_UTC_TIME),
  tickDurationMillis: parseEnvInt(env.ARGON_TICK_DURATION_MILLIS),
  channelHoldExpirationTicks: parseEnvInt(env.ARGON_CHANNEL_HOLD_EXPIRATION_TICKS),
  ntpPoolUrl: env.ARGON_NTP_SERVER,
  defaultDataDir: env.ULX_DATA_DIR,
};
