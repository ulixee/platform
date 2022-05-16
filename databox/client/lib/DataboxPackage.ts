import IDataboxRunOptions from '@ulixee/databox-interfaces/IDataboxRunOptions';
import UlixeeConfig from '@ulixee/commons/config';
import UlixeeServerConfig from '@ulixee/commons/config/servers';
import readCommandLineArgs from './utils/readCommandLineArgs';
import IComponents, { IRunFn } from '../interfaces/IComponents';
import DataboxInternal from './DataboxInternal';
import IBasicInput from '../interfaces/IBasicInput';

const { version } = require('../package.json');

export default class DataboxPackage<TInput = IBasicInput, TOutput = any> {
  #components: IComponents<TInput, TOutput>;

  constructor(components: IRunFn<TInput, TOutput> | IComponents<TInput, TOutput>) {
    this.#components =
      typeof components === 'function'
        ? {
            run: components as IRunFn<TInput, TOutput>,
          }
        : { ...components };
    if (process.env.ULX_DATABOX_RUN_LATER) return;

    const options: IDataboxRunOptions = readCommandLineArgs();

    if (!options.connectionToCore) {
      const serverHost =
        UlixeeConfig.load()?.serverHost ??
        UlixeeConfig.global.serverHost ??
        UlixeeServerConfig.global.getVersionHost(version);
      if (serverHost) {
        options.connectionToCore = { host: serverHost };
      }
    }

    // already logged
    this.run(options).catch(() => null);
  }

  public async run(options: IDataboxRunOptions = {}): Promise<TOutput> {
    const databoxInternal = new DataboxInternal<TInput, TOutput>(
      options,
      this.#components.defaults,
    );
    const shouldRunFull = !databoxInternal.sessionIdToExtract;
    try {
      if (shouldRunFull) {
        await databoxInternal.execRunner(this.#components.run);
      }

      if (this.#components.extract) {
        await databoxInternal.execExtractor(this.#components.extract);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`ERROR running databox: `, error);
      databoxInternal.emit('error', error);
      throw error;
    } finally {
      await databoxInternal.close();
    }

    return databoxInternal.output;
  }
}
