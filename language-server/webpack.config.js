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
  optimization: {
    minimize: false, // for easier debugging
  },
  externals: {
    vscode: 'commonjs',
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      localTypeInfoBaseURL: path.resolve(__dirname, '../', 'metadata', 'rawTypeInfos'),
      isWebpack: JSON.stringify(true),
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
