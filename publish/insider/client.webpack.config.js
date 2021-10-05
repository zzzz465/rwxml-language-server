/* eslint-disable @typescript-eslint/no-var-requires */
// webpack setting that is currently not used.
'use strict'

const path = require('path')
const webpack = require('webpack')

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node',
  entry: path.resolve(__dirname, '..', '..', 'vsc-extension', 'src', 'index.ts'),
  resolveLoader: {
    modules: [path.resolve(__dirname, '..', '..', 'vsc-extension', 'node_modules')]
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'client/index.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode',
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.LANGUAGE_SERVER_MODULE_PATH_RELATIVE': JSON.stringify('./dist/language-server/index.js'),
      'process.env.EXTRACTOR_PATH_WIN32': JSON.stringify('./dist/extractor'),
      'process.env.EXTRACTOR_PATH_LINUX': JSON.stringify('./dist/extractor'),
      'process.env.isWebpack': JSON.stringify(true),
    })
  ],
  resolve: {
    extensions: ['.ts', '.js'],
    // jsnext:main is added because typescript-collections use amd by main, so it breaks webpack build.
    mainFields: ['module', 'jsnext:main', 'main'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              projectReferences: true,
            },
          },
        ],
      },
    ],
  },
}

module.exports = config
