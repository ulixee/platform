import IRunnerPluginCore from '@ulixee/datastore/interfaces/IRunnerPluginCore';
import DatastoreCore from '@ulixee/datastore-core';

const pkg = require('@ulixee/datastore-plugins-puppeteer/package.json');

export default class DatastoreForPuppeteerCore implements IRunnerPluginCore {
  public name = pkg.name;
  public version = pkg.version;
  public nodeVmRequireWhitelist = ['@ulixee/*', 'puppeteer']

  public static register(): void {
    DatastoreCore.registerPlugin(new DatastoreForPuppeteerCore());
  }
}
