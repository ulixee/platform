import { Crawler } from '@ulixee/datastore';
import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import ICrawlerOutputSchema from '@ulixee/datastore/interfaces/ICrawlerOutputSchema';

export default class ClientForCrawler<TCrawler extends Crawler> {
  private crawler: TCrawler;

  constructor(crawler: TCrawler) {
    this.crawler = crawler;
  }

  public crawl(inputFilter: TCrawler['schemaType']['input']): ResultIterable<ICrawlerOutputSchema> {
    return this.crawler.runInternal(inputFilter);
  }
}
