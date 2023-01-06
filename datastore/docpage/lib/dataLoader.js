module.exports = function dataLoader() {
  const options = this.getOptions() || {};
  return JSON.stringify(options.data || {});
}
