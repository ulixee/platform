import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import Datastore from '@ulixee/datastore';
import { IOutputSchema } from '../interfaces/IInputOutput';

export default class ClientForDatastore<TDatastore extends Datastore> {
  private datastore: TDatastore;

  constructor(datastore: TDatastore) {
    this.datastore = datastore;
  }

  public fetch<T extends keyof TDatastore['runners']>(
    runnerName: T,
    inputFilter: TDatastore['runners'][T]['schemaType']['input'],
  ): ResultIterable<TDatastore['runners'][T]['schemaType']['output']>;
  public fetch<T extends keyof TDatastore['tables']>(
    tableName: T,
    inputFilter: TDatastore['tables'][T]['schemaType'],
  ): ResultIterable<TDatastore['tables'][T]['schemaType']>;
  public fetch(name, inputFilter): any {
    const instance = this.datastore.runners[name] || this.datastore.tables[name];
    if (!instance) throw new Error(`${name} is not a valid Datastore Runner or Table name.`);
    return instance.runInternal({ input: inputFilter });
  }

  public run<T extends keyof TDatastore['runners']>(
    runnerName: T,
    inputFilter: TDatastore['runners'][T]['schemaType']['input'],
  ): ResultIterable<TDatastore['runners'][T]['schemaType']['output']>;
  public run<T extends keyof TDatastore['tables']>(
    tableName: T,
    inputFilter: TDatastore['tables'][T]['schemaType'],
  ): ResultIterable<TDatastore['tables'][T]['schemaType']>;
  public run(name, inputFilter): any {
    return this.fetch(name, inputFilter);
  }

  public crawl<T extends keyof TDatastore['crawlers']>(
    name: T,
    inputFilter: TDatastore['crawlers'][T]['schemaType']['input'],
  ): any {
    return this.datastore.crawlers[name].runInternal({ input: inputFilter });
  }

  public query<TResult extends IOutputSchema = IOutputSchema>(
    sql: string,
    boundValues: any[],
  ): Promise<TResult> {
    return this.datastore.queryInternal(sql, boundValues);
  }
}
