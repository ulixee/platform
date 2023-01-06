import { ExtractSchemaType } from '@ulixee/schema';
import ITableSchema from '../interfaces/ITableSchema';
import ITableComponents from '../interfaces/ITableComponents';
import DatastoreInternal from './DatastoreInternal';

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
  #datastoreInternal: DatastoreInternal;
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

private get datastoreInternal(): DatastoreInternal {
    if (!this.#datastoreInternal) {
      this.#datastoreInternal = new DatastoreInternal({ tables: { [this.name]: this } });
      this.#datastoreInternal.onCreateInMemoryDatabase(this.createInMemoryTable.bind(this));
    }
    return this.#datastoreInternal;
  }

  public async query(sql: string, boundValues: any[] = []): Promise<ExtractSchemaType<TSchema>[]> {
    await this.datastoreInternal.ensureDatabaseExists();
    const name = this.components.name;
    const datastoreInstanceId = this.datastoreInternal.instanceId;
    const datastoreVersionHash = this.datastoreInternal.manifest?.versionHash;
    const args = {
      name,
      sql,
      boundValues,
      datastoreInstanceId,
      datastoreVersionHash,
    };
    return await this.datastoreInternal.sendRequest({
      command: 'Datastore.queryInternalTable',
      args: [args],
    });
  }

  public attachToDatastore(datastoreInternal: DatastoreInternal<any, any>, tableName: string): void {
    this.components.name = tableName;
    if (this.#datastoreInternal && this.#datastoreInternal === datastoreInternal) return;
    if (this.#datastoreInternal) {
      throw new Error(`${tableName} Table is already attached to a Datastore`);
    }

    this.#datastoreInternal = datastoreInternal;
    if (!datastoreInternal.manifest?.versionHash) {
      this.#datastoreInternal.onCreateInMemoryDatabase(this.createInMemoryTable.bind(this));
    }
  }

  private async createInMemoryTable(): Promise<void> {
    if (this.#isInMemoryTableCreated) return;
    this.#isInMemoryTableCreated = true;
    const datastoreInstanceId = this.datastoreInternal.instanceId;
    const name = this.components.name ?? 'this';
    const args = {
      name,
      datastoreInstanceId,
      schema: this.components.schema,
      seedlings: this.seedlings,
    };
    await this.datastoreInternal.sendRequest({
      command: 'Datastore.createInMemoryTable',
      args: [args],
    });
  }
}
