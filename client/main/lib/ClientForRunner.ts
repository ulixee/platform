import { Runner } from '@ulixee/datastore';
import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import { ExtractSchemaType } from '@ulixee/schema';
import { IOutputSchema } from '../interfaces/IInputOutput';

export default class ClientForRunner<TRunner extends Runner>  {
  private runner: TRunner;
  constructor(runner: TRunner) {
    this.runner = runner;
  }

  public fetch(
    inputFilter: ExtractSchemaType<TRunner['schema']['input']>,
  ): ResultIterable<any> {
    return this.runner.runInternal({ input: inputFilter });
  }

  public run(
    inputFilter?: ExtractSchemaType<TRunner['schema']['input']>,
  ): ResultIterable<ExtractSchemaType<TRunner['schema']['output']>> {
    return this.fetch(inputFilter);
  }

  public query<TSchema extends IOutputSchema = IOutputSchema>(
    sql: string,
    boundValues: any[] = [],
  ): Promise<TSchema[]> {
    return this.runner.queryInternal(sql, boundValues);
  }
}