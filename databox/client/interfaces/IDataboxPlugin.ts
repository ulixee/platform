import IDataboxExecOptions from '@ulixee/databox-interfaces/IDataboxExecOptions';
import IDataboxSchema from '@ulixee/databox-interfaces/IDataboxSchema';
import DataboxInternal from '../lib/DataboxInternal';
import { IDefaultsObj } from './IComponents';

export default interface IDataboxPlugin<ISchema extends IDataboxSchema> {
  shouldRun?: boolean;
  onStarted?(
    databoxInternal: DataboxInternal<ISchema>,
    options: IDataboxExecOptions<ISchema>,
    defaults: IDefaultsObj<ISchema>,
  ): void | Promise<void>;
  onBeforeRun?(databoxObject: IDefaultsObj<ISchema>): void | Promise<void>;
  onBeforeClose?(): void | Promise<void>;
  onClose?(): void | Promise<void>;
}
