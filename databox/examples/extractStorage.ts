import Databox from '@ulixee/databox-for-hero';

export default new Databox({
  async run({ hero, extractLater }) {
    await hero.goto('https://ulixee.org');
    await hero.waitForPaintingStable();
    await extractLater('localStorage', await hero.getJsValue('JSON.stringify(localStorage)'));
    await extractLater('sessionStorage', await hero.getJsValue('JSON.stringify(sessionStorage)'));
    await extractLater('cookies', await hero.activeTab.cookieStorage.getItems());
    await extractLater('history', await hero.getJsValue(`history.length`));
  },
  async extract({ collectedSnippets, output }) {
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
