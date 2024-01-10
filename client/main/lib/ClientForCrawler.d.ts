import { Crawler } from '@ulixee/datastore';
import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import { IDatastoreBinding } from '@ulixee/datastore/lib/DatastoreInternal';
import ICrawlerOutputSchema from '@ulixee/datastore/interfaces/ICrawlerOutputSchema';
export default class ClientForCrawler<TCrawler extends Crawler> {
    private crawler;
    private readonly readyPromise;
    constructor(crawler: TCrawler, options?: IDatastoreBinding);
    crawl(inputFilter: TCrawler['schemaType']['input']): ResultIterable<ICrawlerOutputSchema>;
}
