import DefaultPackagedDatabox, { IConnectionToCoreOptions } from '@ulixee/databox';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import ConnectionToLocalCore from './ConnectionToLocalCore';

export default class PackagedDatabox extends DefaultPackagedDatabox {
  public static createConnectionToCoreFn(options: IConnectionToCoreOptions) {
    const connection = new ConnectionToLocalCore({ ...options });
    ShutdownHandler.register(() => connection.disconnect());
    return connection;
  }
}
