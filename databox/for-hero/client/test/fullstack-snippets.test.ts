import { Helpers } from '@ulixee/databox-testing';
import RunnerObject from '../lib/RunnerObject';
import ExtractorObject from '../lib/ExtractorObject';

let koaServer: Helpers.ITestKoaServer;
beforeAll(async () => {
  koaServer = await Helpers.runKoaServer();
});
afterAll(() => Promise.all([Helpers.afterAll(), Helpers.afterAll()]));
afterEach(() => Promise.all([Helpers.afterEach(), Helpers.afterEach()]));

describe('basic snippets tests', () => {
  it('collects snippets for extraction', async () => {
    const databoxInternal = await Helpers.createFullstackDataboxInternal();
    const runnerObject = new RunnerObject(databoxInternal);
    Helpers.needsClosing.push(databoxInternal);
    Helpers.needsClosing.push(runnerObject.hero);
    await runnerObject.hero.goto(`${koaServer.baseUrl}/`);

    await runnerObject.extractLater('data', { value: true });
    await runnerObject.extractLater('text', 'string');
    await runnerObject.extractLater('number', 1);

    const extractorObject = new ExtractorObject(databoxInternal);
    await expect(extractorObject.collectedSnippets.get('data')).resolves.toMatchObject({ value: true });
    await expect(extractorObject.collectedSnippets.get('text')).resolves.toBe('string');
    await expect(extractorObject.collectedSnippets.get('number')).resolves.toBe(1);
  });
});
