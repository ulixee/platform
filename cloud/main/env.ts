import { loadEnv, parseEnvBool } from '@ulixee/commons/lib/envUtils';

loadEnv(process.cwd());
loadEnv(__dirname);
const env = process.env;

export default {
  disableChromeAlive: env.NODE_ENV === 'test' || parseEnvBool(env.ULX_DISABLE_CHROMEALIVE),
  leadNodeHost: env.ULX_LEADER_NODE_HOST,
};
