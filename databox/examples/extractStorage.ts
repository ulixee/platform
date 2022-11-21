// NOTE: you must start your own Ulixee Miner to run this example.

import { Function, HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';

export default new Function(
  {
    async run({ hero }) {
      await hero.goto('https://ulixee.org');
      await hero.waitForPaintingStable();
      await hero.setSnippet('localStorage', await hero.getJsValue('JSON.stringify(localStorage)'));
      await hero.setSnippet(
        'sessionStorage',
        await hero.getJsValue('JSON.stringify(sessionStorage)'),
      );
      await hero.setSnippet('cookies', await hero.activeTab.cookieStorage.getItems());
      await hero.setSnippet('history', await hero.getJsValue(`history.length`));
    },
    async afterHeroCompletes({ heroReplay, output }) {
      const localStorage = await heroReplay.getSnippet('localStorage');
      const sessionStorage = await heroReplay.getSnippet('sessionStorage');
      const cookies = await heroReplay.getSnippet('cookies');
      const history = await heroReplay.getSnippet('history');

      output.rootStorage = {
        local: localStorage,
        session: sessionStorage,
        cookies,
        history,
      };
    },
  },
  HeroFunctionPlugin,
);
