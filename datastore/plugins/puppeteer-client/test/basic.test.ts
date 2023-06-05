import { Helpers } from '@ulixee/datastore-testing';
import { Extractor, PuppeteerExtractorPlugin } from '../index';

afterAll(Helpers.afterAll);

describe('basic puppeteerExtractor tests', () => {
  it('waits until run method is explicitly called', async () => {
    let hasCompleted = false;
    const puppeteerExtractor = new Extractor(async ctx => {
      const browser = await ctx.launchBrowser();
      const page = await browser.newPage();
      await page.goto('https://example.org');
      await page.close();
      hasCompleted = true;
    }, PuppeteerExtractorPlugin);
    await puppeteerExtractor.runInternal({});
    expect(hasCompleted).toBe(true);
  }, 30e3);

  it('should call close on puppeteer automatically', async () => {
    let closeSpy: jest.SpyInstance;
    const puppeteerExtractor = new Extractor(async ctx => {
      const browser = await ctx.launchBrowser();
      closeSpy = jest.spyOn(browser, 'close');
      const page = await browser.newPage();
      await page.goto('https://example.org');
    }, PuppeteerExtractorPlugin);
    await puppeteerExtractor.runInternal({});
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit close puppeteer on error', async () => {
    let closeSpy: jest.SpyInstance;
    const puppeteerExtractor = new Extractor(async ctx => {
      const browser = await ctx.launchBrowser();
      closeSpy = jest.spyOn(browser, 'close');
      const page = await browser.newPage();
      await page.goto('https://example.org').then(() => {
        throw new Error('testy');
      });
    }, PuppeteerExtractorPlugin);

    await expect(puppeteerExtractor.runInternal({})).rejects.toThrow('testy');
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
