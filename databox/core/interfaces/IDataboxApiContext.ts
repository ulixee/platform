import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import IDataboxCoreConfigureOptions from '@ulixee/databox-interfaces/IDataboxCoreConfigureOptions';
import IDataboxCoreRuntime from '@ulixee/databox-interfaces/IDataboxCoreRuntime';
import DataboxRegistry from '../lib/DataboxRegistry';
import WorkTracker from '../lib/WorkTracker';
import SidechainClientManager from '../lib/SidechainClientManager';

export default interface IDataboxApiContext {
  logger: IBoundLog;
  databoxRegistry: DataboxRegistry;
  workTracker: WorkTracker;
  configuration: IDataboxCoreConfigureOptions;
  coreRuntimesByName: { [name: string]: IDataboxCoreRuntime };
  sidechainClientManager: SidechainClientManager;
}
