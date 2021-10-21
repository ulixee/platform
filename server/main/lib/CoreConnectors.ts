import Server from '../index';
import BaseCoreConnector from './BaseCoreConnector';
import HeroCoreConnector from './HeroCoreConnector';
import ChromeAliveCoreConnector from './ChromeAliveCoreConnector';
import DataboxCoreConnector from './DataboxCoreConnector';

let isConnected = false;

export default class CoreConnectors {
  public heroConnector: HeroCoreConnector;

  private coreConnectors: BaseCoreConnector[] = [];

  constructor(server: Server) {
    if (isConnected) {
      throw new Error('CoreConnectors already initialized');
    }

    this.heroConnector = new HeroCoreConnector(server);
    this.coreConnectors.push(this.heroConnector);
    this.coreConnectors.push(new DataboxCoreConnector(server));
    if (ChromeAliveCoreConnector.isInstalled()) {
      this.coreConnectors.push(new ChromeAliveCoreConnector(server));
    }
  }

  public async start() {
    for (const coreConnector of this.coreConnectors) {
      await coreConnector.start();
    }
    isConnected = true;
  }

  public async close() {
    for (const coreConnector of this.coreConnectors) {
      await coreConnector.close();
    }
    isConnected = false;
  }
}
