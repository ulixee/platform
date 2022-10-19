import DataboxExecutable from '@ulixee/databox/lib/DataboxExecutable';
import IDataboxSchema from '@ulixee/databox-interfaces/IDataboxSchema';
import { ExtractSchemaType } from '@ulixee/schema';
import DataboxForHeroPlugin from './DataboxForHeroPlugin';
import IComponents from '../interfaces/IComponents';
import IDataboxForHeroExecOptions from '../interfaces/IDataboxForHeroExecOptions';

export default class DataboxForHero<
  ISchema extends IDataboxSchema = IDataboxSchema<any, any>,
> extends DataboxExecutable<ISchema> {
  constructor(components: IComponents<ISchema>['run'] | IComponents<ISchema>) {
    super(components);
    this.plugins.add(DataboxForHeroPlugin);
  }

  override exec(
    options: IDataboxForHeroExecOptions<ISchema>,
  ): Promise<ExtractSchemaType<ISchema['output']>> {
    return super.exec(options);
  }
}
