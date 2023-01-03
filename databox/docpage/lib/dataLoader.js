module.exports = function dataLoader(source) {
  const options = this.getOptions() || {};
  return JSON.stringify(options.data || {});
}