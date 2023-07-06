module.exports = {
  lintOnSave: false,
  runtimeCompiler: true,
  pages: {
    index: {
      entry: './src/main.ts',
      template: './public/index.html',
      filename: 'index.html',
      title: 'Ulixee, The Open Data Platform',
    },
  },
  chainWebpack: config => {
    config.module
      .rule('vue')
      .use('vue-loader')
      .loader('vue-loader')
      .tap(options => {
        // https://github.com/vuejs/vue-next/pull/1600
        options.compilerOptions = options.compilerOptions || {};
        options.compilerOptions.whitespace = 'preserve'
        return options
      });
  }
}
