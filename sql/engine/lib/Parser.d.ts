import { IStatement } from '@ulixee/sql-ast';
import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
export declare enum SupportedCommandType {
    insert = "insert",
    select = "select",
    update = "update",
    delete = "delete"
}
declare type ISupportedCommandType = keyof typeof SupportedCommandType;
declare type ILimitedTo = {
    table?: string;
    function?: string;
};
interface IInputSchemasByName<T = Record<string, IAnySchemaJson>> {
    [name: string]: T;
}
export default class SqlParser {
    ast: IStatement;
    private limitedTo;
    constructor(sql: string, limitedTo?: ILimitedTo, replaceTableNames?: {
        [name: string]: string;
    });
    get tableNames(): string[];
    get functionNames(): string[];
    get commandType(): ISupportedCommandType;
    hasReturn(): boolean;
    toSql(): string;
    isSelect(): boolean;
    isInsert(): boolean;
    isUpdate(): boolean;
    isDelete(): boolean;
    extractTableQuery(tableName: string, _boundValues: any): {
        sql: string;
        args: any[];
    };
    extractFunctionCallInputs<T>(schemasByName: IInputSchemasByName<T>, boundValues: any[]): {
        [functionName: string]: any;
    };
}
export {};
