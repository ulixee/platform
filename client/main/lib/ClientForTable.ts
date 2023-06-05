import { Table } from '@ulixee/datastore';
import { IDatastoreBinding } from '@ulixee/datastore/lib/DatastoreInternal';
import { IOutputSchema } from '../interfaces/IInputOutput';

export default class ClientForTable<TTable extends Table> {
  private table: TTable;
  private readonly readyPromise: Promise<any>;

  constructor(table: TTable, options?: IDatastoreBinding) {
    this.table = table;
    this.readyPromise = this.table.bind(options).catch(() => null);
  }

  public async fetch(inputFilter: Partial<TTable['schemaType']>): Promise<TTable['schemaType'][]> {
    await this.readyPromise;
    return this.table.fetchInternal({ input: inputFilter } as any);
  }

  public async run(inputFilter?: Partial<TTable['schemaType']>): Promise<TTable['schemaType'][]> {
    await this.readyPromise;
    return this.fetch(inputFilter);
  }

  public async query<TOutputSchema extends IOutputSchema = IOutputSchema>(
    sql: string,
    boundValues: any[] = [],
  ): Promise<TOutputSchema[]> {
    await this.readyPromise;
    return this.table.queryInternal(sql, boundValues);
  }
}
