import { astMapper, astVisitor, IStatement, parseFirst, toSql } from '@ulixee/sql-ast';
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

  constructor(
    sql: string,
    limitedTo: ILimitedTo = {},
    replaceTableNames: { [name: string]: string } = {},
  ) {
    this.limitedTo = limitedTo;
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public extractTableQuery(tableName: string, _boundValues: any): { sql: string; args: any[] } {
    // const input: any = {}
    // let columns: string[];
    // const visitor = astVisitor(() => ({
    //   fromTable(t) {
    //     // TODO: how do you pull out the right sql for this?
    //   }
    // }));
    // visitor.statement(this.ast);
    // return input;
    return { sql: `SELECT * FROM ${tableName}`, args: [] };
  }

  public extractFunctionCallInputs<T>(
    schemasByName: IInputSchemasByName<T>,
    boundValues: any[],
  ): { [functionName: string]: any } {
    const inputByFunction: { [name: string]: any } = {};
    const limitedToFunction = this.limitedTo?.function;
    const visitor = astVisitor(() => ({
      call(t: any) {
        if (limitedToFunction && limitedToFunction !== t.function.name) {
          throw new Error(`function does not exist: ${t.function.name}`);
        }
        inputByFunction[t.function.name] = {};
        for (const arg of t.args) {
          if (arg.type === 'parameter') {
            const argIndex = Number(arg.name.replace('$', '')) - 1;
            if (Number.isNaN(argIndex) || argIndex > boundValues.length) {
              throw new Error(
                `Error parsing function inputs. Trying to convert arg (${arg.name}) to an index ${argIndex}.`,
              );
            }
            inputByFunction[t.function.name][arg.key] = boundValues[argIndex];
          } else {
            inputByFunction[t.function.name][arg.key] = arg.value;
          }
        }
      },
    }));
    visitor.statement(this.ast);

    return inputByFunction;
  }
}
