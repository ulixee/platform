// NOTE: you must start your own Ulixee Miner to run this example.

import { Crawler, Databox, Function, HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';
import * as moment from 'moment';

const databox = new Databox({
  crawlers: {
    crawl: new Crawler(async ({ Hero }) => {
      const hero = new Hero();
      await hero.goto('https://ulixee.org');
      await hero.waitForPaintingStable();
      await hero.setSnippet('localStorage', await hero.getJsValue('JSON.stringify(localStorage)'));
      await hero.setSnippet(
        'sessionStorage',
        await hero.getJsValue('JSON.stringify(sessionStorage)'),
      );
      await hero.setSnippet('cookies', await hero.activeTab.cookieStorage.getItems());
      await hero.setSnippet('history', await hero.getJsValue(`history.length`));

      return hero;
    }, HeroFunctionPlugin),
  },
  functions: {
    extract: new Function(async ({ HeroReplay, Output }) => {
      const lastRun = await databox.crawl('crawl', { maxTimeInCache: 24 * 60 * 60 });

      const heroReplay = new HeroReplay(lastRun);
      const localStorage = await heroReplay.getSnippet('localStorage');
      const sessionStorage = await heroReplay.getSnippet('sessionStorage');
      const cookies = await heroReplay.getSnippet('cookies');
      const history = await heroReplay.getSnippet('history');

      Output.emit({
        rootStorage: {
          local: localStorage,
          session: sessionStorage,
          cookies,
          history,
        },
      });
    }, HeroFunctionPlugin),
  },
});
export default databox;
