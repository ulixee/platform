import { RunnerObject as RunnerObjectBase } from "@ulixee/databox";
import { Browser as PuppeteerBrowser } from 'puppeteer';

export default interface IRunnerObject<TInput, TOutput> extends RunnerObjectBase<TInput, TOutput> {
  browser: PuppeteerBrowser;
}