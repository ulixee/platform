import IDataboxExecOptions from './IDataboxExecOptions';
import IDataboxInternal from './IDataboxInternal';
import IDataboxObject from './IDataboxObject';
import IDataboxSchema from './IDataboxSchema';

export default interface IDataboxPlugin<ISchema extends IDataboxSchema> {
  name: string;
  version: string;
  shouldRun?: boolean;
  onStart?(
    databoxInternal: IDataboxInternal<ISchema>,
    execOptions: IDataboxExecOptions<ISchema>,
    defaults: any,
  ): void | Promise<void>;
  onBeforeRun?(databoxObject: IDataboxObject<ISchema>): void | Promise<void>;
  onBeforeClose?(): void | Promise<void>;
  onClose?(): void | Promise<void>;
}
