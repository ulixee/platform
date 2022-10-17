// NOTE: you must start your own Ulixee Server to run this example.

import Databox from '@ulixee/databox-for-hero';

export default new Databox({
  async run({ hero }) {
      await hero.goto('https://ulixee.org');
      await hero.waitForPaintingStable();
      await hero.collect('localStorage', await hero.getJsValue('JSON.stringify(localStorage)'));
      await hero.collect('sessionStorage', await hero.getJsValue('JSON.stringify(sessionStorage)'));
      await hero.collect('cookies', await hero.activeTab.cookieStorage.getItems());
      await hero.collect('history', await hero.getJsValue(`history.length`));
    },
  async runExtractor({ hero, output }) {
    const { collectedSnippets } = hero;
    const localStorage = await collectedSnippets.get('localStorage');
    const sessionStorage = await collectedSnippets.get('sessionStorage');
    const cookies = await collectedSnippets.get('cookies');
    const history = await collectedSnippets.get('history');

    output.rootStorage = {
      local: localStorage,
      session: sessionStorage,
      cookies,
      history,
    };
  },
});
