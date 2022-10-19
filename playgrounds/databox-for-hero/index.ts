import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import '@ulixee/commons/lib/SourceMapSupport';
import DataboxForHero, {
  IHeroCreateOptions,
  Observable,
  DataboxObject,
} from '@ulixee/databox-for-hero';
import readCommandLineArgs from '@ulixee/databox/lib/utils/readCommandLineArgs';
import HeroCore from '@ulixee/hero-core';
import UlixeeServer from '@ulixee/server';
import UlixeeServerConfig from '@ulixee/commons/config/servers';

const { version } = require('./package.json');

export { Observable, IHeroCreateOptions, DataboxObject };

export default class DataboxPlayground extends DataboxForHero {
  public static override async commandLineExec<TOutput>(
    databoxForHero: DataboxForHero,
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
    return databoxForHero.exec(options).catch(err => err);
  }
}
