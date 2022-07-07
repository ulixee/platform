// eslint-disable-next-line import/no-extraneous-dependencies
const SetupAwaitedHandler = require('@ulixee/hero/lib/SetupAwaitedHandler');
// eslint-disable-next-line import/no-extraneous-dependencies
const DataboxManifest = require('@ulixee/databox-core/lib/DataboxManifest').default;

// Jest tries to deeply recursively extract properties from objects when a test breaks - this does not play nice with AwaitedDom
const originGetProperty = SetupAwaitedHandler.delegate.getProperty;
SetupAwaitedHandler.delegate.getProperty = function getProperty(...args) {
  const parentPath = new Error().stack;
  if (parentPath.includes('deepCyclicCopy')) {
    return null;
  }
  // eslint-disable-next-line prefer-rest-params
  return originGetProperty(...args);
};

DataboxManifest.prototype._save = DataboxManifest.prototype.save;
jest.spyOn(DataboxManifest.prototype, 'save').mockImplementation(async function save() {
  if (this.source === 'global') return;
  return await this._save();
});
