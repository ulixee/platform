import UlixeeConfig from '@ulixee/commons/config';
import { loadEnv, parseEnvBool, parseEnvInt } from '@ulixee/commons/lib/envUtils';

loadEnv(process.cwd());
loadEnv(UlixeeConfig.global.directoryPath);
loadEnv(__dirname);
const env = process.env;

export default {
  argonMainchainUrl: env.ARGON_MAINCHAIN_URL,
  tickDurationMillis: parseEnvInt(env.ARGON_TICK_DURATION_MILLIS),
  channelHoldExpirationTicks: parseEnvInt(env.ARGON_CHANNEL_HOLD_EXPIRATION_TICKS),
  ntpPoolUrl: env.ARGON_NTP_SERVER,
  allowMinimumAffordableChannelHold: parseEnvBool(env.ALLOW_MIN_AFFORDABLE_CHANNEL_HOLD),
};
