import { Crawler } from '@ulixee/datastore';
import ICrawlerOutputSchema from '@ulixee/datastore/interfaces/ICrawlerOutputSchema';
import { IDatastoreBinding } from '@ulixee/datastore/lib/DatastoreInternal';
import ResultIterable from '@ulixee/datastore/lib/ResultIterable';

export default class ClientForCrawler<TCrawler extends Crawler> {
  private crawler: TCrawler;
  private readonly readyPromise: Promise<any>;

  constructor(crawler: TCrawler, options?: IDatastoreBinding) {
    this.crawler = crawler;
    this.readyPromise = this.crawler.bind(options).catch(() => null);
  }

  public crawl(inputFilter: TCrawler['schemaType']['input']): ResultIterable<ICrawlerOutputSchema> {
    return this.crawler.runInternal(inputFilter, {
      beforeQuery: () => this.readyPromise,
    });
  }
}
