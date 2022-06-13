import '@ulixee/commons/lib/SourceMapSupport';
import Core from '@ulixee/hero-core';
import DefaultHero, { IHeroCreateOptions } from '@ulixee/hero';
import UlixeeServer from '@ulixee/server';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
const { version } = require('./package.json');

export * from '@ulixee/hero';
export { Core };

export default class Hero extends DefaultHero {
  constructor(createOptions: IHeroCreateOptions = {}) {
    createOptions.connectionToCore = { host: getCoreServerHost() };
    super(createOptions);
  }
}

async function getCoreServerHost(): Promise<string> {
  let serverHost = UlixeeServer.getHost(version);

  // start a server if none already started
  if (!serverHost) {
    const server = new UlixeeServer();
    await server.listen();
    serverHost = await server.address;
    console.log('Started Ulixee server at %s', serverHost);
    Core.onShutdown = () => server.close();
    ShutdownHandler.register(() => server.close());
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
