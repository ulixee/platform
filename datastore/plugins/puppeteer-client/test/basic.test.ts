import { Helpers } from '@ulixee/datastore-testing';
import { Runner, PuppeteerRunnerPlugin } from '../index';

afterAll(Helpers.afterAll);

describe('basic puppeteerRunner tests', () => {
  it('waits until run method is explicitly called', async () => {
    let hasCompleted = false;
    const puppeteerRunner = new Runner(async ctx => {
      const browser = await ctx.launchBrowser();
      const page = await browser.newPage();
      await page.goto('https://example.org');
      await page.close();
      hasCompleted = true;
    }, PuppeteerRunnerPlugin);
    await puppeteerRunner.runInternal({});
    expect(hasCompleted).toBe(true);
  }, 30e3);

  it('should call close on puppeteer automatically', async () => {
    let closeSpy: jest.SpyInstance;
    const puppeteerRunner = new Runner(async ctx => {
      const browser = await ctx.launchBrowser();
      closeSpy = jest.spyOn(browser, 'close');
      const page = await browser.newPage();
      await page.goto('https://example.org');
    }, PuppeteerRunnerPlugin);
    await puppeteerRunner.runInternal({});
    expect(closeSpy).toBeCalledTimes(1);
  });

  it('should emit close puppeteer on error', async () => {
    let closeSpy: jest.SpyInstance;
    const puppeteerRunner = new Runner(async ctx => {
      const browser = await ctx.launchBrowser();
      closeSpy = jest.spyOn(browser, 'close');
      const page = await browser.newPage();
      await page.goto('https://example.org').then(() => {
        throw new Error('testy');
      });
    }, PuppeteerRunnerPlugin);

    await expect(puppeteerRunner.runInternal({})).rejects.toThrowError('testy');
    expect(closeSpy).toBeCalledTimes(1);
  });
});
