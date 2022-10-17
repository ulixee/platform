// NOTE: you must start your own Ulixee Server to run this example.

import Databox from '@ulixee/databox-for-hero';

export default new Databox({
  async run({ hero }) {
      await hero.goto('https://ulixee.org');
      await hero.waitForPaintingStable();
      await hero.setData('localStorage', await hero.getJsValue('JSON.stringify(localStorage)'));
      await hero.setData('sessionStorage', await hero.getJsValue('JSON.stringify(sessionStorage)'));
      await hero.setData('cookies', await hero.activeTab.cookieStorage.getItems());
      await hero.setData('history', await hero.getJsValue(`history.length`));
    },
  async onAfterHeroCompletes({ heroReplay, output }) {
    const localStorage = await heroReplay.getData('localStorage');
    const sessionStorage = await heroReplay.getData('sessionStorage');
    const cookies = await heroReplay.getData('cookies');
    const history = await heroReplay.getData('history');

    output.rootStorage = {
      local: localStorage,
      session: sessionStorage,
      cookies,
      history,
    };
  },
});
