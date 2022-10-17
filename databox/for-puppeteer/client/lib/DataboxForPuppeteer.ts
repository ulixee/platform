import Databox from '@ulixee/databox';
import IDataboxSchema, { ExtractSchemaType } from '@ulixee/databox-interfaces/IDataboxSchema';
import IComponents from '../interfaces/IComponents';
import IDataboxForPuppeteerExecOptions from '../interfaces/IDataboxForPuppeteerExecOptions';
import DataboxForPuppeteerPlugin from './DataboxForPuppeteerPlugin';

export default class DataboxForPuppeteer<
  ISchema extends IDataboxSchema = IDataboxSchema<any, any>,
> extends Databox<ISchema> {
  constructor(components: IComponents<ISchema>['run'] | IComponents<ISchema>) {
    super(components);
    this.plugins.add(DataboxForPuppeteerPlugin);
  }

  override exec(
    options: IDataboxForPuppeteerExecOptions<ISchema>,
  ): Promise<ExtractSchemaType<ISchema['output']>> {
    return super.exec(options);
  }
}
