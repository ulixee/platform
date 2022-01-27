import IDataboxRunOptions from '@ulixee/databox-interfaces/IDataboxRunOptions';
import IDataboxPackage from '@ulixee/databox-interfaces/IDataboxPackage';
import readCommandLineArgs from './utils/readCommandLineArgs';
import Interactor from './Interactor';
import Extractor from './Extractor';
import IComponents, { IInteractFn } from '../interfaces/IComponents';
import DataboxInternal from './DataboxInternal';

export default class DataboxPackage implements IDataboxPackage {
  #components: IComponents;

  constructor(components: IInteractFn | IComponents) {
    this.#components = (typeof components === 'function') ? {
      interact: components as IInteractFn,
    } : { ...components };
    if (process.env.DATABOX_RUN_LATER) return;

    const options: IDataboxRunOptions = readCommandLineArgs();
    this.run(options).catch(error => {
      // eslint-disable-next-line no-console
      console.error(`ERROR running databox: `, error);
    });
  }

  public async run(options: IDataboxRunOptions = {}): Promise<void> {
    const databoxInternal = new DataboxInternal(options);
    const shouldRunInteract = !databoxInternal.sessionIdToExtract;
    try {
      if (shouldRunInteract) {
        const interactor = new Interactor(databoxInternal);
        await this.#components.interact(interactor);
      }

      if (this.#components.extract) {
        const extractor = new Extractor(databoxInternal);
        await this.#components.extract(extractor);
      }
    } catch (error) {
      databoxInternal.emit('error', error);
      throw error;
    } finally {
      await databoxInternal.close();
    }

    return databoxInternal.output;
  }
}
