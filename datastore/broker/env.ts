import { loadEnv, parseEnvBool, parseEnvInt, parseEnvPath } from '@ulixee/commons/lib/envUtils';
import ILocalchainConfig from '@ulixee/datastore/interfaces/ILocalchainConfig';

loadEnv(process.cwd());
loadEnv(__dirname);
const env = process.env;
if (env.ULX_DATABROKER_DIR) env.ULX_DATABROKER_DIR = parseEnvPath(env.ULX_DATABROKER_DIR);

export default {
  port: parseEnvInt(env.ULX_DATABROKER_PORT) ?? 0,
  storageDir: env.ULX_DATABROKER_DIR,
  isTestEnv: env.NODE_ENV === 'test',
  localchainConfig: getLocalchainConfig(),
};

function getLocalchainConfig(): ILocalchainConfig | undefined {
  if (!env.ARGON_LOCALCHAIN_PATH && !env.ARGON_MAINCHAIN_URL) return;
  let keystorePassword: Buffer | undefined;
  if (env.ARGON_LOCALCHAIN_PASSWORD) {
    keystorePassword = Buffer.from(env.ARGON_LOCALCHAIN_PASSWORD, 'utf8');
    delete process.env.ARGON_LOCALCHAIN_PASSWORD;
  }
  if (env.ARGON_LOCALCHAIN_PASSWORD_FILE)
    env.ARGON_LOCALCHAIN_PASSWORD_FILE = parseEnvPath(env.ARGON_LOCALCHAIN_PASSWORD_FILE);
  if (env.ARGON_LOCALCHAIN_PATH) env.ARGON_LOCALCHAIN_PATH = parseEnvPath(env.ARGON_LOCALCHAIN_PATH);

  return <ILocalchainConfig>{
    localchainPath: env.ARGON_LOCALCHAIN_PATH,
    argonMainchainUrl: env.ARGON_MAINCHAIN_URL,
    notaryId: parseEnvInt(env.NOTARY_ID),
    keystorePassword: {
      interactiveCli: parseEnvBool(env.ARGON_LOCALCHAIN_PASSWORD_INTERACTIVE_CLI),
      password: keystorePassword,
      passwordFile: env.ARGON_LOCALCHAIN_PASSWORD_FILE,
    },
  };
}
