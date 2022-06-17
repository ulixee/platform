import Hero from '@ulixee/hero';
import RunnerObjectAbstract from '@ulixee/databox/lib/abstracts/RunnerObjectAbstract'
import DataboxInternal from './DataboxInternal';

export default class RunnerObject<TInput, TOutput> extends RunnerObjectAbstract<TInput, TOutput> {
  protected override readonly databoxInternal: DataboxInternal<TInput, TOutput>;

  constructor(databoxInternal: DataboxInternal<TInput, TOutput>) {
    super(databoxInternal);
    this.extractLater = this.extractLater.bind(this);
  }

  public async extractLater(name: string, value: any): Promise<void> {
    const coreSession = await this.databoxInternal.coreSessionPromise;
    await coreSession.collectSnippet(name, value);
  }

  public get hero(): Hero {
    return this.databoxInternal.hero;
  }

  public get sessionId(): DataboxInternal<TInput, TOutput>['sessionId'] {
    return this.databoxInternal.sessionId;
  }
}
