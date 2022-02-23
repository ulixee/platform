const path = require("path");
const CopyPlugin = require('copy-webpack-plugin')

const srcDir = path.join(__dirname, "src");
const outputDir = path.resolve(__dirname, '../../build/apps/chromealive/extension');

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
    filename: "[name].js",
  },
  optimization: {},
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: path.resolve('manifest.json'), to: `${outputDir}/manifest.json` },
        { from: path.resolve('data/coreServer.json'), to: `${outputDir}/data/coreServer.json` },
      ],
    }),
  ],
};
