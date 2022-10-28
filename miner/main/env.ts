import { loadEnv, parseEnvBool } from '@ulixee/commons/lib/envUtils';

loadEnv(__dirname);
const env = process.env;

export default {
  disableChromeAlive: env.NODE_ENV === 'test' || parseEnvBool(env.ULX_DISABLE_CHROMEALIVE),
};
