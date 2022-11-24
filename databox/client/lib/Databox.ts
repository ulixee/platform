import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import SqlParser from '@ulixee/sql-parser';
import IDataboxComponents from '../interfaces/IDataboxComponents';
import DataboxInternal from './DataboxInternal';
import Function from './Function';
import Table from './Table';

const pkg = require('../package.json');

export default class Databox<
  TTable extends Table<any>,
  TFunction extends Function<any>,
  TComponents extends IDataboxComponents<TTable, TFunction> = IDataboxComponents<TTable, TFunction>,
  TTableNames extends keyof TComponents['tables'] & string = keyof TComponents['tables'] & string,
  TFunctionNames extends keyof TComponents['functions'] & string = keyof TComponents['functions'] &string,
> {
  #databoxInternal: DataboxInternal;
  #components: TComponents;

  public readonly coreVersion = pkg.version;
  public readonly functions: {
    [T in TFunctionNames]: TComponents['functions'][T] extends Function<any>
    ? TComponents['functions'][T]
    : never;
  } = {} as any;

  public readonly tables: {
    [T in TTableNames]: TComponents['tables'][T] extends Table<any>
    ? TComponents['tables'][T]
    : never;
  } = {} as any;

  constructor(components: TComponents, databoxInternal?: DataboxInternal) {
    this.#components = components;
    this.#databoxInternal = databoxInternal ?? new DataboxInternal();
    for (const [name, func] of Object.entries(this.#components.functions || [])) {
      this.addFunction(func, name);
    }
    for (const [name, table] of Object.entries(this.#components.tables || [])) {
      this.addTable(table, name);
    }
  }

  public async query(sql: string | any, boundValues: any[] = []): Promise<any> {
    await this.#databoxInternal.ensureDatabaseExists();
    const databoxInstanceId = this.#databoxInternal.instanceId;
    const databoxVersionHash = this.#databoxInternal.manifest?.versionHash;
    
    const sqlParser = new SqlParser(sql);
    const schemas = Object.keys(this.functions).reduce((obj, k) => {
      return Object.assign(obj, { [k]: this.functions[k].schema.input });
    }, {});
    const inputsByFunction = sqlParser.extractFunctionInputs(schemas, boundValues);
    const functionRecordsByName: { [name: string]: any[] } = {};

    for (const functionName of Object.keys(inputsByFunction)) {
      const input = inputsByFunction[functionName];
      const output = await this.functions[functionName].exec({ input });
      functionRecordsByName[functionName] = Array.isArray(output) ? output : [output];
    }

    const args = {
      sql,
      boundValues,
      functionRecordsByName,
      databoxInstanceId,
      databoxVersionHash,
    };
    return await this.#databoxInternal.sendRequest({ command: 'Databox.queryInternal', args: [args] });
  }

  public addManifest(manifest?: IDataboxManifest): void {
    this.#databoxInternal.manifest = manifest;
  }

  private addFunction(func: Function, nameOverride?: string): void {
    const isFunction = func instanceof Function;
    const name = nameOverride || func.name
    if (!name) throw new Error(`Function requires a name`);
    if (!isFunction) throw new Error(`${name} must be an instance of Function`);
    if (this.tables[name]) throw new Error(`Function already exists with name: ${name}`);

    func.attachToDatabox(this.#databoxInternal, name);
    this.functions[name] = func as any;
  }

  private addTable(table: Table, nameOverride?: string): void {
    const isTable = table instanceof Table;
    const name = nameOverride || table.name
    if (!name) throw new Error(`Table requires a name`);
    if (!isTable) throw new Error(`${name || 'table'} must be an instance of Table`);
    if (this.tables[name]) throw new Error(`Table already exists with name: ${name}`);

    table.attachToDatabox(this.#databoxInternal, name);
    this.tables[name] = table as any;
  }
}
