import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import '@ulixee/commons/lib/SourceMapSupport';
import DataboxWrapper, {
  Extractor,
  IHeroCreateOptions,
  Observable,
  Runner,
} from '@ulixee/databox-for-hero';
import readCommandLineArgs from '@ulixee/databox-for-hero/lib/utils/readCommandLineArgs';
import HeroCore from '@ulixee/hero-core';
import UlixeeServer from '@ulixee/server';
import UlixeeConfig from '@ulixee/commons/config';
import UlixeeServerConfig from '@ulixee/commons/config/servers';

const { version } = require('./package.json');

export { Observable, IHeroCreateOptions, Runner, Extractor };

export default class DataboxPlayground extends DataboxWrapper {
  public static override async autoRun<T>(databoxWrapper: DataboxWrapper): Promise<T | Error> {
    let serverHost =
      UlixeeConfig.load()?.serverHost ??
      UlixeeConfig.global.serverHost ??
      UlixeeServerConfig.global.getVersionHost(version);

    // start a server if none already started
    if (!serverHost) {
      const server = new UlixeeServer();
      await server.listen();
      serverHost = await server.address;
      console.log('Started Ulixee server at %s', serverHost);
      ShutdownHandler.register(() => server.close());
    }

    HeroCore.events.once('browser-has-no-open-windows', ({ browser }) => browser.close());
    HeroCore.events.once('all-browsers-closed', () => {
      console.log('Automatically shutting down Hero Core (Browser Closed)');
      return HeroCore.shutdown();
    });

    const options = readCommandLineArgs();
    options.connectionToCore = { host: serverHost };
    return databoxWrapper.run(options).catch(err => err);
  }
}
