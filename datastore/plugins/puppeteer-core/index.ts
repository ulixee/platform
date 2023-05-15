import IExtractorPluginCore from '@ulixee/datastore/interfaces/IExtractorPluginCore';

const pkg = require('@ulixee/datastore-plugins-puppeteer/package.json');

export default class DatastoreForPuppeteerCore implements IExtractorPluginCore {
  public name = pkg.name;
  public version = pkg.version;
  public nodeVmRequireWhitelist = ['@ulixee/*', 'puppeteer'];
}
