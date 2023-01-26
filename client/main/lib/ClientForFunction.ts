import { Function } from '@ulixee/datastore';
import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import { ExtractSchemaType } from '@ulixee/schema';
import { IOutputSchema } from '../interfaces/IInputOutput';

export default class ClientForFunction<TFunction extends Function>  {
  private func: TFunction;
  constructor(func: TFunction) {
    this.func = func;
  }

  public fetch(
    inputFilter: ExtractSchemaType<TFunction['schema']['input']>,
  ): ResultIterable<any> {
    return this.func.runInternal({ input: inputFilter });
  }

  public run(
    inputFilter?: ExtractSchemaType<TFunction['schema']['input']>,
  ): ResultIterable<ExtractSchemaType<TFunction['schema']['output']>> {
    return this.fetch(inputFilter);
  }

  public query<TSchema extends IOutputSchema = IOutputSchema>(
    sql: string,
    boundValues: any[] = [],
  ): Promise<TSchema[]> {
    return this.func.queryInternal(sql, boundValues);
  }
}