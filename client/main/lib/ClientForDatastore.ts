import { EventEmitter } from 'events';
import { ExtractSchemaType } from '@ulixee/schema';
import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import Datastore from '@ulixee/datastore';
import { IOutputSchema } from '../interfaces/IInputOutput';

export default class ClientForDatastore<TDatastore extends Datastore> extends EventEmitter  {
  private datastore: TDatastore;

  constructor(datastore: TDatastore) {
    super();
    this.datastore = datastore;
  }

  public fetch<T extends keyof TDatastore['runners']>(
    funcName: T,
    inputFilter: ExtractSchemaType<TDatastore['runners'][T]['schema']['input']>,
  ): ResultIterable<ExtractSchemaType<TDatastore['runners'][T]['schema']['output']>>;
  public fetch<T extends keyof TDatastore['tables']>(
    tableTable: T,
    inputFilter: ExtractSchemaType<TDatastore['tables'][T]['schema']['input']>,
  ): ResultIterable<ExtractSchemaType<TDatastore['tables'][T]['schema']['output']>>;
  public fetch(name, inputFilter): any {
    const instance = this.datastore.runners[name] || this.datastore.tables[name];
    return instance.runInternal(inputFilter);
  }

  public run<T extends keyof TDatastore['runners']>(
    funcName: T,
    inputFilter: ExtractSchemaType<TDatastore['runners'][T]['schema']['input']>,
  ): ResultIterable<ExtractSchemaType<TDatastore['runners'][T]['schema']['output']>>;
  public run<T extends keyof TDatastore['tables']>(
    tableTable: T,
    inputFilter: ExtractSchemaType<TDatastore['tables'][T]['schema']['input']>,
  ): ResultIterable<ExtractSchemaType<TDatastore['tables'][T]['schema']['output']>>;
  public run(name, inputFilter): any {
    return this.fetch(name, inputFilter);
  }

  public crawl<T extends keyof TDatastore['crawlers']>(
    name: T, 
    inputFilter: ExtractSchemaType<TDatastore['crawlers'][T]['schema']>,
  ): any {
    return this.datastore.crawlers[name].runInternal(inputFilter);
  }

  public query<TResult extends IOutputSchema = IOutputSchema>(sql: string, boundValues: any[]): Promise<TResult> {
    return this.datastore.queryInternal(sql, boundValues);
  }
}