import ISqlAdapter from '@ulixee/sql-engine/interfaces/ISqlAdapter';

export default interface ISqlConnection {
  createAdapter(): ISqlAdapter;
  run(sql: string, boundValues: any[], withReturn?: boolean): Promise<{ changes: number }>;
  run<T = any>(sql: string, boundValues: any[], withReturn?: true): Promise<T>;
  all<T = any>(sql: string, boundValues: any[]): Promise<T[]>;
  get<T = any>(sql: string, boundValues: any[]): Promise<T>;
  createVirtualTable(name: string, options: IVirtualTableInterface): Promise<void>;

  close(): Promise<void>;
}

export interface IVirtualTableInterface {
  rows: Record<string, any>[];
  columns: string[];
  parameters?: string[];
}
