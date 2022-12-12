import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import { SqlParser } from '@ulixee/sql-engine';
import ConnectionToDataboxCore from '../connections/ConnectionToDataboxCore';
import IDataboxComponents from '../interfaces/IDataboxComponents';
import DataboxInternal, { IFunctions, ITables } from './DataboxInternal';
import Function from './Function';
import Table from './Table';

const pkg = require('../package.json');

export default class Databox<
  TTable extends Table<any>,
  TFunction extends Function<any>,
  TComponents extends IDataboxComponents<TTable, TFunction> = IDataboxComponents<TTable, TFunction>,
> {
  #databoxInternal: DataboxInternal<TTable, TFunction, TComponents>;

  public get paymentAddress(): string | undefined {
    return this.#databoxInternal.components.paymentAddress;
  }

  public get giftCardIssuerIdentity(): string | undefined {
    return this.#databoxInternal.components.giftCardIssuerIdentity;
  }

  public get functions(): IFunctions<TTable, TFunction> {
    return this.#databoxInternal.functions;
  }

  public get tables(): ITables<TTable, TFunction> {
    return this.#databoxInternal.tables;
  }

  public get remoteDataboxes(): IDataboxComponents<TTable, TFunction>['remoteDataboxes'] {
    return this.#databoxInternal.remoteDataboxes;
  }

  public get authenticateIdentity(): IDataboxComponents<TTable, TFunction>['authenticateIdentity'] {
    return this.#databoxInternal.authenticateIdentity;
  }

  public readonly coreVersion = pkg.version;

  constructor(
    components: TComponents,
    databoxInternal?: DataboxInternal<TTable, TFunction, TComponents>,
  ) {
    this.#databoxInternal = databoxInternal ?? new DataboxInternal(components);
    this.#databoxInternal.databox = this;
    for (const [name, func] of Object.entries(components.functions || [])) {
      this.#databoxInternal.attachFunction(func, name);
    }
    for (const [name, table] of Object.entries(components.tables || [])) {
      this.#databoxInternal.attachTable(table, name);
    }
  }

  public async query(sql: string, boundValues: any[] = []): Promise<any> {
    await this.#databoxInternal.ensureDatabaseExists();
    const databoxInstanceId = this.#databoxInternal.instanceId;
    const databoxVersionHash = this.#databoxInternal.manifest?.versionHash;

    const sqlParser = new SqlParser(sql);
    const schemas = Object.keys(this.functions).reduce((obj, k) => {
      return Object.assign(obj, { [k]: this.functions[k].schema.input });
    }, {});
    const inputByFunctionName = sqlParser.extractFunctionInputs(schemas, boundValues);
    const outputByFunctionName: { [name: string]: any[] } = {};

    for (const functionName of Object.keys(inputByFunctionName)) {
      const input = inputByFunctionName[functionName];
      const output = await this.functions[functionName].exec({ input });
      outputByFunctionName[functionName] = Array.isArray(output) ? output : [output];
    }

    const args = {
      sql,
      boundValues,
      inputByFunctionName,
      outputByFunctionName,
      databoxInstanceId,
      databoxVersionHash,
    };
    return await this.#databoxInternal.sendRequest({
      command: 'Databox.queryInternal',
      args: [args],
    });
  }

  public addConnectionToDataboxCore(
    connectionToCore: ConnectionToDataboxCore,
    manifest?: IDataboxManifest,
  ): void {
    this.#databoxInternal.manifest = manifest;
    this.#databoxInternal.connectionToCore = connectionToCore;
  }
}
