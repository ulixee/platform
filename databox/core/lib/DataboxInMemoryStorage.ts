import * as Database from 'better-sqlite3';
import DataboxStorage, { IStorage } from './DataboxStorage';

export default class DataboxInMemoryStorage extends DataboxStorage {
  static #byInstanceId: { [instanceId: string]: IStorage } = {};

  constructor(instanceId: string) {
    const storage = DataboxInMemoryStorage.#byInstanceId[instanceId] || {
      db: new Database(instanceId), 
      tableSchemaByName: {},
      functionSchemaByName: {},
    };
    DataboxInMemoryStorage.#byInstanceId[instanceId] = storage;
    super(storage);
  }

  public static delete(instanceId: string): void {
    delete this.#byInstanceId[instanceId];
  }
}