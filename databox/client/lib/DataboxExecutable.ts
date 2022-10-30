import IDataboxExecOptions from '@ulixee/databox-interfaces/IDataboxExecOptions';
import IDataboxSchema, { ExtractSchemaType } from '@ulixee/databox-interfaces/IDataboxSchema';
import IDataboxObject from '@ulixee/databox-interfaces/IDataboxObject';
import DataboxInternal from './DataboxInternal';
import DataboxObject from './DataboxObject';
import Autorun from './utils/Autorun';
import IComponents, { IDefaultsObj } from '../interfaces/IComponents';
import readCommandLineArgs from './utils/readCommandLineArgs';
import Plugins from './Plugins';

const pkg = require('../package.json');

type TComponents<ISchema> = IComponents<ISchema, IDataboxObject<ISchema>, IDefaultsObj<ISchema>>;

export default class DataboxExecutable<ISchema extends IDataboxSchema = IDataboxSchema<any, any>> {
  #isRunning = false;
  public readonly coreVersion = pkg.version;
  public readonly corePlugins: { [name: string]: string } = {};
  public readonly plugins: Plugins<ISchema>;

  public get schema(): ISchema {
    return this.components.schema;
  }

  public disableAutorun: boolean;
  public successCount = 0;
  public errorCount = 0;

  private readonly components: TComponents<ISchema>;

  constructor(components: TComponents<ISchema>['run'] | TComponents<ISchema>) {
    this.components =
      typeof components === 'function'
        ? {
            run: components,
          }
        : { ...components };

    this.plugins = new Plugins(this.components, this.corePlugins);
    this.disableAutorun = Boolean(
      JSON.parse(process.env.ULX_DATABOX_DISABLE_AUTORUN?.toLowerCase() ?? 'false'),
    );
  }

  public async exec(
    options: IDataboxExecOptions<ISchema>,
  ): Promise<ExtractSchemaType<ISchema['output']>> {
    if (this.#isRunning) {
      throw new Error('Databox already running');
    }
    this.#isRunning = true;
    const databoxInternal = new DataboxInternal<ISchema>(options, this.components);

    try {
      databoxInternal.validateInput();
      await this.plugins.onStart(databoxInternal, options, this.components.defaults);

      if (this.components.run && this.plugins.shouldRun) {
        const databoxObject = new DataboxObject<ISchema>(databoxInternal);
        await this.plugins.onBeforeRun(databoxObject);
        await databoxInternal.execRunner(databoxObject, this.components.run);
      }

      await this.plugins.onBeforeClose();
      databoxInternal.validateOutput();

      this.successCount++;
      return databoxInternal.output;
    } catch (error) {
      console.error(`ERROR running databox: `, error);
      this.errorCount++;
      throw error;
    } finally {
      await databoxInternal.close();
      await this.plugins.onClose();
      this.#isRunning = false;
    }
  }

  public static commandLineExec<TOutput>(
    databoxExecutable: DataboxExecutable<any>,
  ): Promise<TOutput | Error> {
    const options = readCommandLineArgs();
    return databoxExecutable.exec(options).catch(err => err);
  }
}

Autorun.setupAutorunBeforeExitHook(DataboxExecutable, module.parent, require.main);
