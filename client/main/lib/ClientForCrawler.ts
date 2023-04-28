import { Crawler } from '@ulixee/datastore';
import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import { IDatastoreBinding } from '@ulixee/datastore/lib/DatastoreInternal';
import ICrawlerOutputSchema from '@ulixee/datastore/interfaces/ICrawlerOutputSchema';

export default class ClientForCrawler<TCrawler extends Crawler> {
  private crawler: TCrawler;
  private readonly readyPromise: Promise<any>;

  constructor(crawler: TCrawler, options?: IDatastoreBinding) {
    this.crawler = crawler;
    this.readyPromise = this.crawler.bind(options).catch(() => null);
  }

  public crawl(inputFilter: TCrawler['schemaType']['input']): ResultIterable<ICrawlerOutputSchema> {
    return this.crawler.runInternal(inputFilter);
  }
}
