const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const srcDir = path.join(__dirname, 'src');
const outDir = process.env.BUILD_DIR ?? 'build';
const outputDir = path.resolve(
  __dirname,
  path.join('../..', outDir, 'apps/chromealive-core/extension'),
);

module.exports = {
  devtool: 'inline-source-map',
  mode: 'development',
  entry: {
    background: path.join(srcDir, 'background.ts'),
    content: path.join(srcDir, 'content.ts'),
    devtools: path.join(srcDir, 'devtools.ts'),
  },
  output: {
    path: outputDir,
    filename: '[name].js',
  },
  optimization: {
    minimize: false,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: path.resolve('manifest.json'), to: `${outputDir}/manifest.json` }],
    }),
  ],
};
