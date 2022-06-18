import { Browser as PuppeteerBrowser } from 'puppeteer';
import RunnerObjectAbstract from '@ulixee/databox/lib/abstracts/RunnerObjectAbstract'
import DataboxInternal from './DataboxInternal';

export default class RunnerObject<TInput, TOutput> extends RunnerObjectAbstract<TInput, TOutput> {
  protected override readonly databoxInternal: DataboxInternal<TInput, TOutput>;

  public get browser(): PuppeteerBrowser {
    return this.databoxInternal.puppeteerBrowser;
  }
}
