/* eslint-disable @typescript-eslint/no-var-requires */
// webpack setting that is currently not used.
'use strict'

const path = require('path')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node',
  entry: './src/index.ts',
  resolveLoader: {
    modules: ['node_modules'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode',
  },
  plugins: [
    // definePlugin's value must be passed with JSON.stringify()
    new webpack.DefinePlugin({
      'process.env.LANGUAGE_SERVER_MODULE_PATH_RELATIVE': JSON.stringify('./server-dist/index.js'),
      'process.env.isWebpack': JSON.stringify(true),
      'process.env.EXTRACTOR_PATH_WIN32': JSON.stringify('../extractor/extractor/bin/Debug'), // debug on windows only
      'process.env.EXTRACTOR_PATH_LINUX': JSON.stringify('../extractor/extractor/bin/Debug'), // debug on windows only
    }),
  ],
  resolve: {
    extensions: ['.ts', '.js'],
    mainFields: ['module', 'jsnext:main', 'main'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
    ],
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true,
          keep_fnames: true,
        },
      }),
    ],
  },
}

module.exports = config
