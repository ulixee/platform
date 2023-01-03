module.exports = class ReplaceConfigFile {
  constructor(configFile) {
    this.configFile = configFile;
  }

  apply(compiler) {
    const pluginName = this.constructor.name;

    compiler.hooks.compilation.tap(pluginName, compilation => {
      const NormalModule = compiler.webpack?.NormalModule;
      const isNormalModuleAvailable = Boolean(NormalModule);
      if (isNormalModuleAvailable && Boolean(NormalModule.getCompilationHooks)) {
        NormalModule.getCompilationHooks(compilation).beforeLoaders.tap(pluginName, this.tapCallback.bind(this));
      } else {
        compilation.hooks.normalModuleLoader.tap(pluginName, this.tapCallback.bind(this));
      }
    });
  }

  tapCallback(_, normalModule) {
    if (!normalModule.resource.endsWith('docpage/src/data.config.json')) return;
    const loader = require.resolve('./dataLoader.js');
    normalModule.loaders.push({
      loader,
      options: {
        data: this.configFile,
      },
    });
  }
}