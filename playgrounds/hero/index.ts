import '@ulixee/commons/lib/SourceMapSupport';
import Core from '@ulixee/hero-core';
import DefaultHero, { IHeroCreateOptions } from '@ulixee/hero';
import UlixeeServer from '@ulixee/server';
import UlixeeServerConfig from '@ulixee/commons/config/servers';

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
    createOptions.connectionToCore = { host: getCoreServerHost() };
    super(createOptions);
  }
}

async function getCoreServerHost(): Promise<string> {
  let serverHost = UlixeeServer.getHost(version);

  if (serverHost?.startsWith('localhost')) {
    serverHost = await UlixeeServerConfig.global.checkLocalVersionHost(version, serverHost);
  }

  // start a server if none already started
  if (!serverHost) {
    const server = new UlixeeServer();
    await server.listen();
    serverHost = await server.address;
    console.log('Started Ulixee server at %s', serverHost);
  } else {
    console.log('Connecting to Ulixee server at %s', serverHost);
  }

  Core.events.once('browser-has-no-open-windows', ({ browser }) => browser.close());
  Core.events.once('all-browsers-closed', () => {
    console.log('Automatically shutting down Hero Core (Browser Closed)');
    return Core.shutdown();
  });
  return serverHost;
}
