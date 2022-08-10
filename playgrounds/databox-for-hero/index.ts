import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import '@ulixee/commons/lib/SourceMapSupport';
import DataboxWrapper, {
  ExtractorObject,
  IHeroCreateOptions,
  Observable,
  RunnerObject,
} from '@ulixee/databox-for-hero';
import readCommandLineArgs from '@ulixee/databox/lib/utils/readCommandLineArgs';
import HeroCore from '@ulixee/hero-core';
import UlixeeServer from '@ulixee/server';
import UlixeeServerConfig from '@ulixee/commons/config/servers';
import { setupAutorunBeforeExitHook } from '@ulixee/databox/lib/utils/Autorun';

const { version } = require('./package.json');

export { Observable, IHeroCreateOptions, RunnerObject, ExtractorObject };

export default class DataboxPlayground extends DataboxWrapper {
  public static override async run<TOutput>(
    databoxWrapper: DataboxWrapper,
  ): Promise<TOutput | Error> {
    let serverHost = UlixeeServer.getHost(version);

    if (serverHost?.startsWith('localhost')) {
      serverHost = await UlixeeServerConfig.global.checkLocalVersionHost(version, serverHost);
    }

    // start a server if none already started
    if (!serverHost) {
      const server = new UlixeeServer();
      await server.listen();
      serverHost = await server.address;
      HeroCore.onShutdown = () => server.close();
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

setupAutorunBeforeExitHook(DataboxPlayground);
