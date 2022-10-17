import { DataboxObject as DataboxObjectBase } from "@ulixee/databox";
import { Browser as PuppeteerBrowser } from 'puppeteer';

export default interface IDataboxObject<TInput, TOutput> extends DataboxObjectBase<TInput, TOutput> {
  browser: PuppeteerBrowser;
}