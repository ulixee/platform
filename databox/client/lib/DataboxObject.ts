import IDataboxObject from '@ulixee/databox-interfaces/IDataboxObject';
import IDataboxSchema from '@ulixee/databox-interfaces/IDataboxSchema';
import DataboxInternal from './DataboxInternal';

export default class DataboxObject<
  ISchema extends IDataboxSchema,
  TDataboxInternal extends DataboxInternal<ISchema> = DataboxInternal<ISchema>,
> implements IDataboxObject<ISchema>
{
  protected readonly databoxInternal: DataboxInternal<ISchema>;

  constructor(databoxInternal: DataboxInternal<ISchema>) {
    this.databoxInternal = databoxInternal;
  }

  public get input(): TDataboxInternal['input'] {
    return this.databoxInternal.input;
  }

  public get output(): TDataboxInternal['output'] {
    return this.databoxInternal.output;
  }

  public set output(value: TDataboxInternal['output']) {
    this.databoxInternal.output = value;
  }

  public get schema(): ISchema {
    return this.databoxInternal.schema;
  }
}
