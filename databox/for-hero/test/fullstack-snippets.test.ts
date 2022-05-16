import * as Helpers from './_helpers';import { Helpers as HeroHelpers } from '@ulixee/hero-testing';
import DataboxRunner from '../lib/Runner';
import Extractor from '../lib/Extractor';

let koaServer: HeroHelpers.ITestKoaServer;
beforeAll(async () => {
  koaServer = await HeroHelpers.runKoaServer();
});
afterAll(() => Promise.all([Helpers.afterAll(), HeroHelpers.afterAll()]));
afterEach(() => Promise.all([Helpers.afterEach(), HeroHelpers.afterEach()]));

describe('basic snippets tests', () => {
  it('collects snippets for extraction', async () => {
    const databoxInternal = await Helpers.createFullstackDataboxInternal();
    const databox = new DataboxRunner(databoxInternal);
    Helpers.needsClosing.push(databoxInternal);
    Helpers.needsClosing.push(databox.hero);
    await databox.hero.goto(`${koaServer.baseUrl}/`);

    await databox.extractLater('data', { value: true });
    await databox.extractLater('text', 'string');
    await databox.extractLater('number', 1);

    const extractor = new Extractor(databoxInternal);
    await expect(extractor.collectedSnippets.get('data')).resolves.toMatchObject({ value: true });
    await expect(extractor.collectedSnippets.get('text')).resolves.toBe('string')
    await expect(extractor.collectedSnippets.get('number')).resolves.toBe(1)
  });
});
