import '@ulixee/commons/lib/SourceMapSupport';
import Core from '@ulixee/hero-core';
import DefaultHero, { IHeroCreateOptions } from '@ulixee/hero';
import UlixeeMiner from '@ulixee/miner';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';

const { version } = require('./package.json');

export * from '@ulixee/hero';
export { Core };

let counter = 0;
export default class Hero extends DefaultHero {
  constructor(createOptions: IHeroCreateOptions = {}) {
    counter += 1;
    if (counter > 1) {
      console.warn(`You've launched multiple instances of Hero using Hero Playgrounds. @ulixee/hero-playgrounds is intended to help you get started with examples, but will try to automatically shut down after the first example is run. 
      
If you're starting to run real production scenarios, you likely want to look into converting to a Client/Core setup: 

https://ulixee.org/docs/hero/advanced-concepts/client-vs-core
`);
    }
    createOptions.connectionToCore = { host: getCoreHost() };
    super(createOptions);
  }
}

async function getCoreHost(): Promise<string> {
  let minerHost = UlixeeHostsConfig.global.getVersionHost(version);

  if (minerHost?.startsWith('localhost')) {
    minerHost = await UlixeeHostsConfig.global.checkLocalVersionHost(version, minerHost);
  }

  // start a miner if none already started
  if (!minerHost) {
    const miner = new UlixeeMiner();
    await miner.listen();
    minerHost = await miner.address;
    console.log('Started Ulixee Miner at %s', minerHost);
  } else {
    console.log('Connecting to Ulixee Miner at %s', minerHost);
  }

  Core.events.once('browser-has-no-open-windows', ({ browser }) => browser.close());
  Core.events.once('all-browsers-closed', () => {
    console.log('Automatically shutting down Hero Core (Browser Closed)');
    return Core.shutdown();
  });
  return minerHost;
}
