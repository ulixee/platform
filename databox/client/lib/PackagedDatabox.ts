import UlixeeConfig from '@ulixee/commons/config';
import ICollectedResource from '@ulixee/hero-interfaces/ICollectedResource';
import IDataboxRunOptions from '@ulixee/databox-interfaces/IDataboxRunOptions';
import IPackagedDatabox from '@ulixee/databox-interfaces/IPackagedDatabox';
import CollectedFragments from './CollectedFragments';
import readCommandLineArgs from './utils/readCommandLineArgs';
import DataboxInteracting from './DataboxInteracting';
import IComponents, { IInteractFn } from '../interfaces/IComponents';
import ConnectionManager from './ConnectionManager';
import { ICreateConnectionToCoreFn } from '../connections/ConnectionFactory';
import IExtractParams from '../interfaces/IExtractParams';

export default class PackagedDatabox implements IPackagedDatabox {
  public static createConnectionToCoreFn: ICreateConnectionToCoreFn;
  public databoxInteracting: DataboxInteracting;

  #components: IComponents;

  constructor(components: IInteractFn | IComponents) {
    this.#components = (typeof components === 'function') ? {
      interact: components as IInteractFn,
    } : { ...components };
    if (process.env.DATABOX_RUN_LATER) return;

    const options: IDataboxRunOptions = readCommandLineArgs();
    const serverHost = UlixeeConfig.load()?.serverHost ?? UlixeeConfig.global.serverHost;
    if (serverHost) {
      options.connectionToCore = { host: serverHost };
    }

    this.run(options).catch(error => {
      // eslint-disable-next-line no-console
      console.error(`ERROR running databox: `, error);
    });
  }

  public async run(options: IDataboxRunOptions = {}): Promise<void> {
    const { createDataboxInteracting } = this.constructor as typeof PackagedDatabox;
    try {
      this.databoxInteracting = await createDataboxInteracting.call(this, options);
      await this.runFns();
      return this.databoxInteracting.output;
    } catch (error) {
      this.databoxInteracting?.emit('error', error);
      throw error;
    } finally {
      await this.databoxInteracting?.close();
      this.databoxInteracting = undefined;
    }
  }

  private async runFns(): Promise<void> {
    const databoxInteracting = this.databoxInteracting as DataboxInteracting;
    const extractSessionId =
      (databoxInteracting.queryOptions as any).extractSessionId ?? process.env.HERO_EXTRACT_SESSION_ID;

    if (!extractSessionId) {
      await this.#components.interact(databoxInteracting);
    }
    if (this.#components.extract) {
      const { hero } = databoxInteracting;
      const sessionId = extractSessionId ?? (await hero.sessionId);

      const collectedResources: IExtractParams['collectedResources'] = {
        async get(name: string): Promise<ICollectedResource> {
          const resources = await hero.getCollectedResources(sessionId, name);
          if (resources.length) return resources[0];
          return null;
        },
        getAll(name: string): Promise<ICollectedResource[]> {
          return hero.getCollectedResources(sessionId, name);
        },
      };
      await this.#components.extract({
        input: databoxInteracting.input,
        output: databoxInteracting.output,
        collectedFragments: new CollectedFragments(
          hero.getCollectedFragments.bind(hero, sessionId),
        ),
        collectedResources,
      });
    }
  }

  public static async createDataboxInteracting(options: IDataboxRunOptions = {}): Promise<DataboxInteracting> {
    const createConnectionToCoreFn = this.createConnectionToCoreFn;
    const connectionManager = new ConnectionManager({ createConnectionToCoreFn, ...options });
    await connectionManager.getConnectedCoreSessionOrReject();
    await new Promise(process.nextTick);

    return new DataboxInteracting(connectionManager, options);
  }
}
