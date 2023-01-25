import { ExtractSchemaType } from '@ulixee/schema';
import ITableSchema from '../interfaces/ITableSchema';
import ITableComponents from '../interfaces/ITableComponents';
import DatastoreInternal from './DatastoreInternal';

export type IExpandedTableSchema<T> = T extends ITableSchema
  ? {
      [K in keyof T]: T[K];
    }
  : never;

export default class Table<
  TSchema extends IExpandedTableSchema<any> = IExpandedTableSchema<any>,
  TRecords extends ExtractSchemaType<TSchema> = ExtractSchemaType<TSchema>,
  TComponents extends ITableComponents<TSchema, TRecords> = ITableComponents<TSchema, TRecords>,
> {
  seedlings: TRecords[];
  #datastoreInternal: DatastoreInternal;
  #isInMemoryTableCreated = false;

  protected readonly components: TComponents;

  constructor(components: TComponents) {
    this.seedlings = components.seedlings;
    this.components = { ...components };
  }

  public get isPublic(): boolean {
    return this.components.isPublic !== false;
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

  protected get datastoreInternal(): DatastoreInternal {
    if (!this.#datastoreInternal) {
      this.#datastoreInternal = new DatastoreInternal({ tables: { [this.name]: this } });
      this.#datastoreInternal.onCreateInMemoryDatabase(this.createInMemoryTable.bind(this));
    }
    return this.#datastoreInternal;
  }

  public async queryInternal<T = TRecords[]>(sql: string, boundValues: any[] = []): Promise<T> {
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

  public attachToDatastore(
    datastoreInternal: DatastoreInternal<any, any>,
    tableName: string,
  ): void {
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

  protected async createInMemoryTable(): Promise<void> {
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
