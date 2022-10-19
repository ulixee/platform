import IDataboxPluginCore from '@ulixee/databox-interfaces/IDataboxPluginCore';
import DataboxCore from '@ulixee/databox-core';

const pkg = require('@ulixee/databox-for-puppeteer/package.json');

export default class DataboxForPuppeteerCore implements IDataboxPluginCore {
  public name = pkg.name;
  public version = pkg.version;
  public nodeVmRequireWhitelist = ['@ulixee/*', 'puppeteer']

  public static register(): void {
    DataboxCore.registerPlugin(new DataboxForPuppeteerCore());
  }
}
