import Function from '../lib/Function';
import Table from '../lib/Table';

export default interface IDataboxComponents<
  TTable extends Table<any>,
  TFunction extends Function<any>,
> {
  tables?: Record<string, TTable>;
  functions?: Record<string, TFunction>;
}
