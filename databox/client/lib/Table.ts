import { ExtractSchemaType } from '@ulixee/schema';
import ITableSchema from '../interfaces/ITableSchema';
import ITableComponents from '../interfaces/ITableComponents';
import DataboxInternal from './DataboxInternal';

type IExpandedSchema<T> = T extends ITableSchema
  ? {
      [K in keyof T]: T[K];
    }
  : never;

export default class Table<
  TSchema extends IExpandedSchema<any> = IExpandedSchema<any>,
  TRecords extends ExtractSchemaType<ITableSchema> = ExtractSchemaType<ITableSchema>,
> {
  seedlings: TRecords[];
  #databoxInternal: DataboxInternal;
  #isInMemoryTableCreated = false;

  private readonly components: ITableComponents<TSchema, TRecords>;

  constructor(components: ITableComponents<TSchema, TRecords>) {
    this.seedlings = components.seedlings;
    this.components = { ...components };
  }

  public get schema(): TSchema {
    return this.components.schema;
  }

  public get name(): string {
    return this.components.name;
  }

  public get description(): string | undefined {
    return this.components.description;
  }
  
private get databoxInternal(): DataboxInternal {
    if (!this.#databoxInternal) {
      this.#databoxInternal = new DataboxInternal({ tables: { [this.name]: this } });
      this.#databoxInternal.onCreateInMemoryDatabase(this.createInMemoryTable.bind(this));
    }
    return this.#databoxInternal;
  }

  public async query(sql: string, boundValues: any[] = []): Promise<ExtractSchemaType<TSchema>[]> {
    await this.databoxInternal.ensureDatabaseExists();
    const name = this.components.name;
    const databoxInstanceId = this.databoxInternal.instanceId;
    const databoxVersionHash = this.databoxInternal.manifest?.versionHash;
    const args = {
      name,
      sql,
      boundValues,
      databoxInstanceId,
      databoxVersionHash,
    };
    return await this.databoxInternal.sendRequest({
      command: 'Databox.queryInternalTable',
      args: [args],
    });
  }

  public attachToDatabox(databoxInternal: DataboxInternal<any, any>, tableName: string): void {
    this.components.name = tableName;
    if (this.#databoxInternal && this.#databoxInternal === databoxInternal) return;
    if (this.#databoxInternal) {
      throw new Error(`${tableName} Table is already attached to a Databox`);
    }

    this.#databoxInternal = databoxInternal;
    if (!databoxInternal.manifest?.versionHash) {
      this.#databoxInternal.onCreateInMemoryDatabase(this.createInMemoryTable.bind(this));
    }
  }

  private async createInMemoryTable(): Promise<void> {
    if (this.#isInMemoryTableCreated) return;
    this.#isInMemoryTableCreated = true;
    const databoxInstanceId = this.databoxInternal.instanceId;
    const name = this.components.name ?? 'this';
    const args = {
      name,
      databoxInstanceId,
      schema: this.components.schema,
      seedlings: this.seedlings,
    };
    await this.databoxInternal.sendRequest({
      command: 'Databox.createInMemoryTable',
      args: [args],
    });
  }
}
