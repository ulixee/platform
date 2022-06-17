import { Helpers } from '@ulixee/databox-testing';
import { Browser as PuppeteerBrowser } from 'puppeteer';
import DataboxWrapper from '../index';

afterAll(Helpers.afterAll);

describe('basic Databox tests', () => {
  it('automatically runs and closes a databox', async () => {
    const ranScript = new Promise(resolve => {
      DataboxWrapper.defaultExport = new DataboxWrapper(async databox => {
        resolve(true);
      });
    });
    await DataboxWrapper.attemptAutorun();
    await new Promise(resolve => process.nextTick(resolve));
    expect(await ranScript).toBe(true);
  });

  it('waits until run method is explicitly called', async () => {
    process.env.ULX_DATABOX_DISABLE_AUTORUN = 'Y';
    let databaseHasCompleted = false;
    const databoxWrapper = new DataboxWrapper(async databox => {
      const { browser } = databox;
      const page = await browser.newPage();
      await page.goto('https://example.org');
      await page.close();
      databaseHasCompleted = true;
    });
    await databoxWrapper.run({});
    expect(databaseHasCompleted).toBe(true);
  });

  it('should call close on puppeteer automatically', async () => {
    process.env.ULX_DATABOX_DISABLE_AUTORUN = 'Y';
    let browser: PuppeteerBrowser;
    const databoxWrapper = new DataboxWrapper(async databox => {
      browser = databox.browser;
      const page = await browser.newPage();
      await page.goto('https://example.org');
    });
    await databoxWrapper.run({});
    const pages = await browser.pages();
    expect(pages.length).toBe(0);
  });

  it('should emit close hero on error', async () => {
    process.env.ULX_DATABOX_DISABLE_AUTORUN = 'Y';
    const databoxWrapper = new DataboxWrapper(async databox => {
      const browser = databox.browser;
      const page = await browser.newPage();
      await page.goto('https://example.org').then(() => {
        throw new Error('test');
      });
    });

    await expect(databoxWrapper.run({})).rejects.toThrowError();
  });
});
