import { Helpers } from '@ulixee/databox-testing';
import { Helpers as HeroHelpers } from '@ulixee/hero-testing';
import DataboxRunner from '../lib/Runner';

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
    const hero = await openBrowser(`/element-basic`);
    const test1Element = await hero.document.querySelector('.test1');
    await test1Element.$extractLater('a');
    await test1Element.nextElementSibling.$extractLater('b');

    const elementsA = await hero.getCollectedElements(hero.sessionId, 'a');
    expect(elementsA).toHaveLength(1);
    expect(elementsA[0].outerHTML).toBe('<div class="test1">test 1</div>');

    const elementsB = await hero.getCollectedElements(hero.sessionId, 'b');
    expect(elementsB[0].outerHTML).toBe(`<div class="test2">
            <ul><li>Test 2</li></ul>
          </div>`);
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
    const hero = await openBrowser(`/element-list`);
    await hero.document.querySelectorAll('.valid').$extractLater('valid');

    const valid = await hero.getCollectedElements(hero.sessionId, 'valid');
    expect(valid).toHaveLength(3);
    expect(valid[0].outerHTML).toBe('<li class="valid">Test 1</li>');
    expect(valid[1].outerHTML).toBe('<li class="valid">Test 4</li>');
    expect(valid[2].outerHTML).toBe('<li class="valid">Test 5</li>');
  });
});

async function openBrowser(path: string) {
  const databoxInternal = await Helpers.createFullstackDataboxInternal();
  const databoxRunner = new DataboxRunner(databoxInternal);
  const hero = databoxRunner.hero;
  Helpers.needsClosing.push(databoxInternal);
  await hero.goto(`${koaServer.baseUrl}${path}`);
  await hero.waitForPaintingStable();
  return hero;
}
