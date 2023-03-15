import { Runner } from '@ulixee/datastore';
import { IDatastoreBinding } from '@ulixee/datastore/lib/DatastoreInternal';
import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import { IOutputSchema } from '../interfaces/IInputOutput';

export default class ClientForRunner<TRunner extends Runner> {
  private runner: TRunner;
  constructor(runner: TRunner, options?: IDatastoreBinding) {
    this.runner = runner;
    runner.bind(options);
  }

  public fetch(
    inputFilter: TRunner['schemaType']['input'],
  ): ResultIterable<TRunner['schema']['output']> {
    return this.runner.runInternal({ input: inputFilter });
  }

  public run(
    inputFilter?: TRunner['schemaType']['input'],
  ): ResultIterable<TRunner['schemaType']['output']> {
    return this.fetch(inputFilter);
  }

  public query<TSchema extends IOutputSchema = IOutputSchema>(
    sql: string,
    boundValues: any[] = [],
  ): Promise<TSchema[]> {
    return this.runner.queryInternal(sql, boundValues);
  }
}
