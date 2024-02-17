import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import Datastore, { ConnectionToDatastoreCore } from '@ulixee/datastore';
import IStorageEngine from '@ulixee/datastore/interfaces/IStorageEngine';
import ICrawlerOutputSchema from '@ulixee/datastore/interfaces/ICrawlerOutputSchema';
import { IOutputSchema } from '../interfaces/IInputOutput';

export default class ClientForDatastore<TDatastore extends Datastore> {
  private datastore: TDatastore;
  private readyPromise: Promise<any>;

  constructor(
    datastore: TDatastore,
    options?: { connectionToCore: ConnectionToDatastoreCore; storage?: IStorageEngine },
  ) {
    this.datastore = datastore;
    this.readyPromise = this.datastore.bind(options).catch(() => null);
  }

  public fetch<T extends keyof TDatastore['extractors']>(
    extractorName: T,
    inputFilter: TDatastore['extractors'][T]['schemaType']['input'],
  ): ResultIterable<TDatastore['extractors'][T]['schemaType']['output']>;
  public fetch<T extends keyof TDatastore['tables']>(
    tableName: T,
    inputFilter: TDatastore['tables'][T]['schemaType'],
  ): ResultIterable<TDatastore['tables'][T]['schemaType']>;
  public fetch(name, inputFilter): any {
    const instance = this.datastore.extractors[name] || this.datastore.tables[name];
    if (!instance) throw new Error(`${name} is not a valid Datastore Extractor or Table name.`);
    return instance.runInternal(
      { input: inputFilter },
      {
        beforeQuery: () => this.readyPromise,
      },
    );
  }

  public run<T extends keyof TDatastore['extractors']>(
    extractorName: T,
    inputFilter: TDatastore['extractors'][T]['schemaType']['input'],
  ): ResultIterable<TDatastore['extractors'][T]['schemaType']['output']>;
  public run<T extends keyof TDatastore['tables']>(
    tableName: T,
    inputFilter: TDatastore['tables'][T]['schemaType'],
  ): ResultIterable<TDatastore['tables'][T]['schemaType']>;
  public run(name, inputFilter): any {
    return this.fetch(name, inputFilter);
  }

  public async crawl<T extends keyof TDatastore['crawlers']>(
    name: T,
    inputFilter: TDatastore['crawlers'][T]['schemaType']['input'],
  ): Promise<ICrawlerOutputSchema> {
    await this.readyPromise;
    const result = await this.datastore.crawlers[name].runInternal({ input: inputFilter });
    return result[0];
  }

  public async query<TResult extends IOutputSchema = IOutputSchema>(
    sql: string,
    boundValues: any[],
  ): Promise<TResult> {
    await this.readyPromise;
    return this.datastore.queryInternal<TResult>(sql, boundValues);
  }
}
