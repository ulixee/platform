import { astMapper, astVisitor, IStatement, parseFirst, toSql } from '@ulixee/sql-ast';
import { SqlGenerator } from '@ulixee/sql-engine';
import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';

export enum SupportedCommandType {
  insert = 'insert',
  select = 'select',
  update = 'update',
  delete = 'delete',
}

type ISupportedCommandType = keyof typeof SupportedCommandType;
type ILimitedTo = { table?: string; function?: string };

interface IInputSchemasByName<T = Record<string, IAnySchemaJson>> {
  [name: string]: T;
}

export default class SqlParser {
  public ast: IStatement;
  private limitedTo: ILimitedTo = {};
  private hasReturning = false;

  constructor(
    sql: string,
    limitedTo: ILimitedTo = {},
    replaceTableNames: { [name: string]: string } = {},
  ) {
    const cleaner = astMapper(map => ({
      tableRef(t) {
        if (limitedTo.table && t.name === 'self') {
          t.name = limitedTo.table;
        }
        if (replaceTableNames[t.name]) {
          t.name = replaceTableNames[t.name];
        }
        return map.super().tableRef(t);
      },
      call(t) {
        if (limitedTo.function && t.function.name === 'self') {
          t.function.name = limitedTo.function;
        }
        return map.super().call(t);
      },
    }));
    this.ast = cleaner.statement(parseFirst(sql));
    this.limitedTo = limitedTo;
  }

  get tableNames(): string[] {
    const names: Set<string> = new Set();
    const visitor = astVisitor(() => ({
      tableRef: t => names.add(t.name),
    }));
    visitor.statement(this.ast);
    return Array.from(names);
  }

  get functionNames(): string[] {
    const names: Set<string> = new Set();
    const visitor = astVisitor(() => ({
      call: t => names.add(t.function.name),
    }));
    visitor.statement(this.ast);
    return Array.from(names);
  }

  get commandType(): ISupportedCommandType {
    return this.ast.type as ISupportedCommandType;
  }

  public hasReturn(): boolean {
    let hasReturning = false;
    const visitor = astVisitor(() => ({
      insert(t) {
        hasReturning = t.returning?.length > 0;
        return t;
      },
      update(t) {
        hasReturning = t.returning?.length > 0;
        return t;
      },
    }));
    visitor.statement(this.ast);
    return hasReturning;
  }

  public toSql(): string {
    return toSql.statement(this.ast);
  }

  public isSelect(): boolean {
    return this.ast.type === 'select';
  }

  public isInsert(): boolean {
    return this.ast.type === 'insert';
  }

  public isUpdate(): boolean {
    return this.ast.type === 'update';
  }

  public isDelete(): boolean {
    return this.ast.type === 'delete';
  }

  public convertToBoundValuesMap(values: any[]): { [k: string]: any } {
    return values.reduce((a, v, i) => ({ ...a, [i + 1]: v }), {});
  }

  public extractFunctionInput(functionName: string, boundValues: any): { [key: string]: any } {
    const boundValuesMap = this.convertToBoundValuesMap(boundValues);
    const input: any = {};
    const visitor = astVisitor(() => ({
      call(t: any) {
        if (t.function.name !== functionName) return;
        for (const arg of t.args) {
          if (arg.type === 'parameter') {
            input[arg.key] = boundValuesMap[arg.name.replace('$', '')];
          } else {
            input[arg.key] = arg.value;
          }
        }
      },
    }));
    visitor.statement(this.ast);

    return input;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public extractTableQuery(tableName: string, boundValues: any): { sql: string; args: any[] } {
    // const boundValuesMap = this.convertToBoundValuesMap(boundValues);
    // const input: any = {}
    // let columns: string[];
    // const visitor = astVisitor(() => ({
    //   fromTable(t) {
    //     // TODO: how do you pull out the right sql for this?
    //   }
    // }));
    // visitor.statement(this.ast);
    // return input;
    return { sql: `select * from ${tableName}`, args: [] };
  }

  public extractFunctionInputs<T>(
    schemasByName: IInputSchemasByName<T>,
    boundValues: any[],
  ): { [name: string]: any } {
    if (!this.isSelect()) throw new Error('Invalid SQL command');

    const inputByFunction: { [name: string]: any } = {};
    for (const functionName of this.functionNames) {
      if (this.limitedTo.function && this.limitedTo.function !== functionName) {
        throw new Error(`Function does not exist: ${functionName}`);
      }
      const schema = schemasByName[functionName];
      const input = this.extractFunctionInput(functionName, boundValues);
      for (const key of Object.keys(input)) {
        input[key] = SqlGenerator.convertFromSqliteValue(schema[key]?.typeName, input[key]);
      }
      inputByFunction[functionName] = input;
    }

    return inputByFunction;
  }

  // public extractSqlAndValues(sql: string, values: any): { sql: string, values: any } {
  //   return {
  //     sql: sql.replace(/\$([0-9]+)/g, '?$1'),
  //     values: values.reduce((a, v, i) => ({ ...a, [i+1]: v}), {}),
  //   }
  // }
}
