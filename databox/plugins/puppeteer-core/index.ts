import IFunctionPluginCore from '@ulixee/databox/interfaces/IFunctionPluginCore';
import DataboxCore from '@ulixee/databox-core';

const pkg = require('@ulixee/databox-plugins-puppeteer/package.json');

export default class DataboxForPuppeteerCore implements IFunctionPluginCore {
  public name = pkg.name;
  public version = pkg.version;
  public nodeVmRequireWhitelist = ['@ulixee/*', 'puppeteer']

  public static register(): void {
    DataboxCore.registerPlugin(new DataboxForPuppeteerCore());
  }
}
