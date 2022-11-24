import * as Database from 'better-sqlite3';
import DataboxStorage, { IStorage } from './DataboxStorage';

export default class DataboxPackageStorage extends DataboxStorage {
  static #byPath: { [path: string]: IStorage } = {};
  
  constructor(path: string) {
    const storage = DataboxPackageStorage.#byPath[path] || {
      db: new Database(path), 
      tableSchemaByName: {},
      functionSchemaByName: {},
    };
    DataboxPackageStorage.#byPath[path] = storage;
    super(storage);
  }
}