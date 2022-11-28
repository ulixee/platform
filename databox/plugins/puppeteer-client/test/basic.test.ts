import { Helpers } from '@ulixee/databox-testing';
import Autorun from '@ulixee/databox/lib/utils/Autorun';
import { Browser as PuppeteerBrowser } from 'puppeteer';
import { Function, PuppeteerFunctionPlugin } from '../index';

afterAll(Helpers.afterAll);

describe('basic puppeteerFunction tests', () => {
  it('automatically runs and closes a function', async () => {
    const ranScript = new Promise(resolve => {
      Autorun.defaultExport = new Function(async ctx => {
        resolve(true);
      }, PuppeteerFunctionPlugin);
    });
    Autorun.defaultExport.disableAutorun = false;
    await Autorun.attemptAutorun(Function);
    await new Promise(resolve => process.nextTick(resolve));
    expect(await ranScript).toBe(true);
  });

  it('waits until run method is explicitly called', async () => {
    let hasCompleted = false;
    const puppeteerFunction = new Function(async ctx => {
      const { browser } = ctx;
      const page = await browser.newPage();
      await page.goto('https://example.org');
      await page.close();
      hasCompleted = true;
    }, PuppeteerFunctionPlugin);
    puppeteerFunction.disableAutorun = true;
    await puppeteerFunction.exec({});
    expect(hasCompleted).toBe(true);
  }, 30e3);

  it('should call close on puppeteer automatically', async () => {
    let browser: PuppeteerBrowser;
    const puppeteerFunction = new Function(async ctx => {
      browser = ctx.browser;
      const page = await browser.newPage();
      await page.goto('https://example.org');
    }, PuppeteerFunctionPlugin);
    puppeteerFunction.disableAutorun = true;
    await puppeteerFunction.exec({});
    const pages = await browser.pages();
    expect(pages.length).toBe(0);
  });

  it('should emit close puppeteer on error', async () => {
    const puppeteerFunction = new Function(async ctx => {
      const browser = ctx.browser;
      const page = await browser.newPage();
      await page.goto('https://example.org').then(() => {
        throw new Error('test');
      });
    }, PuppeteerFunctionPlugin);
    puppeteerFunction.disableAutorun = true;

    await expect(puppeteerFunction.exec({})).rejects.toThrowError();
  });
});
