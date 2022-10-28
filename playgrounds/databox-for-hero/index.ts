import '@ulixee/commons/lib/SourceMapSupport';
import DataboxForHero, {
  IHeroCreateOptions,
  Observable,
  DataboxObject,
} from '@ulixee/databox-for-hero';
import readCommandLineArgs from '@ulixee/databox/lib/utils/readCommandLineArgs';
import HeroCore from '@ulixee/hero-core';
import UlixeeMiner from '@ulixee/miner';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';

const { version } = require('./package.json');

export { Observable, IHeroCreateOptions, DataboxObject };

export default class DataboxPlayground extends DataboxForHero {
  public static override async commandLineExec<TOutput>(
    databoxForHero: DataboxForHero,
  ): Promise<TOutput | Error> {
    let minerHost = UlixeeMiner.getHost(version);

    if (minerHost?.startsWith('localhost')) {
      minerHost = await UlixeeHostsConfig.global.checkLocalVersionHost(version, minerHost);
    }

    // start a miner if none already started
    if (!minerHost) {
      const miner = new UlixeeMiner();
      await miner.listen();
      minerHost = await miner.address;
      console.log('Started Ulixee Miner at %s', minerHost);
    }

    HeroCore.events.once('browser-has-no-open-windows', ({ browser }) => browser.close());
    HeroCore.events.once('all-browsers-closed', () => {
      console.log('Automatically shutting down Hero Core (Browser Closed)');
      return HeroCore.shutdown();
    });

    const options = readCommandLineArgs();
    options.connectionToCore = { host: minerHost };
    return databoxForHero.exec(options).catch(err => err);
  }
}
