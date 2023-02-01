import { ConnectionToDatastoreCore, Crawler } from '@ulixee/datastore';
import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import ICrawlerOutputSchema from '@ulixee/datastore/interfaces/ICrawlerOutputSchema';

export default class ClientForCrawler<TCrawler extends Crawler> {
  private crawler: TCrawler;

  constructor(crawler: TCrawler, options?: { connectionToCore: ConnectionToDatastoreCore }) {
    this.crawler = crawler;
    if (options.connectionToCore) {
      this.crawler.addConnectionToDatastoreCore(options.connectionToCore);
    }
  }

  public crawl(inputFilter: TCrawler['schemaType']['input']): ResultIterable<ICrawlerOutputSchema> {
    return this.crawler.runInternal(inputFilter);
  }
}
