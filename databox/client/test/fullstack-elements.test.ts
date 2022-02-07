import { Helpers } from '@ulixee/databox-testing';
import { Helpers as HeroHelpers } from '@ulixee/hero-testing';
import Hero from '@ulixee/hero';
import ICoreSession from '@ulixee/hero/interfaces/ICoreSession';
import DataboxInternal from '../lib/DataboxInternal';
import Extractor from '../lib/Extractor';

let koaServer: HeroHelpers.ITestKoaServer;
beforeAll(async () => {
  koaServer = await HeroHelpers.runKoaServer();
});
afterAll(() => Promise.all([Helpers.afterAll(), HeroHelpers.afterAll()]));
afterEach(() => Promise.all([Helpers.afterEach(), HeroHelpers.afterEach()]));

describe('basic Element tests', () => {
  it('can extract elements', async () => {
    koaServer.get('/element-basic', ctx => {
      ctx.body = `
        <body>
          <div class="test1">test 1</div>
          <div class="test2">
            <ul><li>Test 2</li></ul>
          </div>
        </body>
      `;
    });
    const [hero, coreSession, databoxInternal] = await openBrowser(`/element-basic`);
    const sessionId = await hero.sessionId;
    const test1Element = await hero.document.querySelector('.test1');
    await test1Element.$extractLater('a');
    await test1Element.nextElementSibling.$extractLater('b');

    const elementsA = await coreSession.getCollectedElements(sessionId, 'a');
    expect(elementsA).toHaveLength(1);
    expect(elementsA[0].outerHTML).toBe('<div class="test1">test 1</div>');

    const elementsB = await coreSession.getCollectedElements(sessionId, 'b');
    expect(elementsB[0].outerHTML).toBe(`<div class="test2">
            <ul><li>Test 2</li></ul>
          </div>`);

    const extractor = new Extractor(databoxInternal);
    await expect(extractor.collectedElements.names).resolves.toMatchObject(['a','b']);
  });

  it('can extract selectorAll lists', async () => {
    koaServer.get('/element-list', ctx => {
      ctx.body = `
        <body>

            <ul>
              <li class="valid">Test 1</li>
              <li class="invalid">Test 2</li>
              <li class="invalid">Test 3</li>
              <li class="valid">Test 4</li>
              <li class="valid">Test 5</li>
            </ul>
        </body>
      `;
    });
    const [hero, coreSession,databoxInternal] = await openBrowser(`/element-list`);
    const sessionId = await hero.sessionId;
    await hero.document.querySelectorAll('.valid').$extractLater('valid');

    const valid = await coreSession.getCollectedElements(sessionId, 'valid');
    expect(valid).toHaveLength(3);
    expect(valid[0].outerHTML).toBe('<li class="valid">Test 1</li>');
    expect(valid[1].outerHTML).toBe('<li class="valid">Test 4</li>');
    expect(valid[2].outerHTML).toBe('<li class="valid">Test 5</li>');

    const extractor = new Extractor(databoxInternal);
    await expect(extractor.collectedElements.names).resolves.toMatchObject(['valid']);
  });
});

async function openBrowser(path: string): Promise<[Hero, ICoreSession, DataboxInternal<any, any>]> {
  const databoxInternal = await Helpers.createFullstackDataboxInternal();
  const hero = databoxInternal.hero;
  const coreSession = await databoxInternal.coreSessionPromise;
  Helpers.needsClosing.push(databoxInternal);
  await hero.goto(`${koaServer.baseUrl}${path}`);
  await hero.waitForPaintingStable();
  return [hero, coreSession, databoxInternal];
}
