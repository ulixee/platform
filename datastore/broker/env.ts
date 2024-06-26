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
  if (!env.ULX_LOCALCHAIN_PATH && !env.ULX_MAINCHAIN_URL) return;
  let keystorePassword: Buffer | undefined;
  if (env.ULX_LOCALCHAIN_PASSWORD) {
    keystorePassword = Buffer.from(env.ULX_LOCALCHAIN_PASSWORD, 'utf8');
    delete process.env.ULX_LOCALCHAIN_PASSWORD;
  }
  if (env.ULX_LOCALCHAIN_PASSWORD_FILE)
    env.ULX_LOCALCHAIN_PASSWORD_FILE = parseEnvPath(env.ULX_LOCALCHAIN_PASSWORD_FILE);
  if (env.ULX_LOCALCHAIN_PATH) env.ULX_LOCALCHAIN_PATH = parseEnvPath(env.ULX_LOCALCHAIN_PATH);

  return <ILocalchainConfig>{
    localchainPath: env.ULX_LOCALCHAIN_PATH,
    mainchainUrl: env.ULX_MAINCHAIN_URL,
    notaryId: parseEnvInt(env.NOTARY_ID),
    keystorePassword: {
      interactiveCli: parseEnvBool(env.ULX_LOCALCHAIN_PASSWORD_INTERACTIVE_CLI),
      password: keystorePassword,
      passwordFile: env.ULX_LOCALCHAIN_PASSWORD_FILE,
    },
  };
}
