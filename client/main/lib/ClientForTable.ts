import { Table } from '@ulixee/datastore';
import { ExtractSchemaType } from '@ulixee/schema';
import { IOutputSchema } from '../interfaces/IInputOutput';

export default class ClientForTable <TTable extends Table> {
  private table: TTable;

  constructor(table?: TTable) {
    this.table = table;
  }

  public fetch(
    inputFilter: ExtractSchemaType<TTable['schema']>,
  ): Promise<any> {
    return this.table.fetchInternal({ input: inputFilter });
  }

  public run(
    inputFilter?: ExtractSchemaType<TTable['schema']>,
  ): Promise<ExtractSchemaType<TTable['schema']>> {
    return this.fetch(inputFilter);
  }

  public query<TSchema extends IOutputSchema = IOutputSchema>(
    sql: string,
    boundValues: any[] = [],
  ): Promise<TSchema[]> {
    return this.table.queryInternal(sql, boundValues);
  }
}