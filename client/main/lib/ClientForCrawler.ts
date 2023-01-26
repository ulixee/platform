import { EventEmitter } from 'events';
import { Crawler } from '@ulixee/datastore';
import { ExtractSchemaType } from '@ulixee/schema';
import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import ICrawlerOutputSchema from '@ulixee/datastore/interfaces/ICrawlerOutputSchema';

export default class ClientForCrawler<TCrawler extends Crawler> extends EventEmitter  {
  private crawler: TCrawler;

  constructor(crawler: TCrawler) {
    super();
    this.crawler = crawler;
  }

  public crawl(
    inputFilter: ExtractSchemaType<TCrawler['schema']['input']>,
  ): ResultIterable<ICrawlerOutputSchema> {
    return this.crawler.runInternal(inputFilter);
  }
}