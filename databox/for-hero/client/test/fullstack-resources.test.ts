import { Helpers } from '@ulixee/databox-testing';
import Hero from '@ulixee/hero';
import ICoreSession from '@ulixee/hero/interfaces/ICoreSession';
import CollectedResources from '../lib/CollectedResources';

let koaServer: Helpers.ITestKoaServer;
beforeAll(async () => {
  koaServer = await Helpers.runKoaServer();
  koaServer.get('/resources-test', ctx => {
    ctx.body = `<html>
<body>
<a onclick="clicker()" href="#nothing">Click me</a>
</body>
<script>
  let counter = 0
  function clicker() {
    fetch('/ajax?counter=' + (counter++) );
    return false;
  }
</script>
</html>`;
  });
  koaServer.get('/ajax', ctx => {
    ctx.body = {
      hi: 'there',
    };
  });
});
afterAll(() => Promise.all([Helpers.afterAll(), Helpers.afterAll()]));
afterEach(() => Promise.all([Helpers.afterEach(), Helpers.afterEach()]));

async function createBrowser(): Promise<[Hero, ICoreSession]> {
  const databoxInternal = await Helpers.createFullstackDataboxInternal();
  const hero = databoxInternal.hero;
  const coreSession = await databoxInternal.coreSessionPromise;
  Helpers.needsClosing.push(databoxInternal);
  return [hero, coreSession];
}

describe('basic resource tests', () => {
  it('collects resources for extraction', async () => {
    const [hero1, coreSession1] = await createBrowser();
    Helpers.needsClosing.push(hero1);
    {
      await hero1.goto(`${koaServer.baseUrl}/resources-test`);
      await hero1.waitForPaintingStable();
      const elem = hero1.document.querySelector('a');
      await hero1.click(elem);

      const resources = await hero1.waitForResources({ type: 'Fetch' });
      expect(resources).toHaveLength(1);
      await resources[0].$extractLater('xhr');

      const collectedResources = new CollectedResources(
        Promise.resolve(coreSession1),
        hero1.sessionId,
      );
      const collected = await collectedResources.getAll('xhr');
      expect(collected).toHaveLength(1);
      expect(collected[0].json).toEqual({ hi: 'there' });
      await hero1.close();
    }

    // Test that we can load a previous session too
    {
      const [hero2, coreSession2] = await createBrowser();
      Helpers.needsClosing.push(hero2);

      await hero2.goto(`${koaServer.baseUrl}`);
      await hero2.waitForPaintingStable();
      const collectedResources = new CollectedResources(
        Promise.resolve(coreSession2),
        hero1.sessionId,
      );
      const collected2 = await collectedResources.getAll('xhr');
      expect(collected2).toHaveLength(1);
      expect(collected2[0].url).toBe(`${koaServer.baseUrl}/ajax?counter=0`);
      // should prefetch the body
      expect(collected2[0].buffer).toBeTruthy();
    }
  });
});
