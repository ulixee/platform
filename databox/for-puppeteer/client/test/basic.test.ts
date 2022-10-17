import { Helpers } from '@ulixee/databox-testing';
import Autorun from '@ulixee/databox/lib/utils/Autorun';
import { Browser as PuppeteerBrowser } from 'puppeteer';
import DataboxForPuppeteer from '../index';

afterAll(Helpers.afterAll);

describe('basic DataboxForPuppeteer tests', () => {
  it('automatically runs and closes a databox', async () => {
    const ranScript = new Promise(resolve => {
      Autorun.defaultExport = new DataboxForPuppeteer(async databox => {
        resolve(true);
      });
    });
    Autorun.defaultExport.disableAutorun = false;
    await Autorun.attemptAutorun(DataboxForPuppeteer);
    await new Promise(resolve => process.nextTick(resolve));
    expect(await ranScript).toBe(true);
  });

  it('waits until run method is explicitly called', async () => {
    let databaseHasCompleted = false;
    const databoxForPuppeteer = new DataboxForPuppeteer(async databox => {
      const { browser } = databox;
      const page = await browser.newPage();
      await page.goto('https://example.org');
      await page.close();
      databaseHasCompleted = true;
    });
    databoxForPuppeteer.disableAutorun = true;
    await databoxForPuppeteer.exec({});
    expect(databaseHasCompleted).toBe(true);
  }, 30e3);

  it('should call close on puppeteer automatically', async () => {
    let browser: PuppeteerBrowser;
    const databoxForPuppeteer = new DataboxForPuppeteer(async databox => {
      browser = databox.browser;
      const page = await browser.newPage();
      await page.goto('https://example.org');
    });
    databoxForPuppeteer.disableAutorun = true;
    await databoxForPuppeteer.exec({});
    const pages = await browser.pages();
    expect(pages.length).toBe(0);
  });

  it('should emit close hero on error', async () => {
    const databoxForPuppeteer = new DataboxForPuppeteer(async databox => {
      const browser = databox.browser;
      const page = await browser.newPage();
      await page.goto('https://example.org').then(() => {
        throw new Error('test');
      });
    });
    databoxForPuppeteer.disableAutorun = true;

    await expect(databoxForPuppeteer.exec({})).rejects.toThrowError();
  });
});
