/* eslint-disable @typescript-eslint/no-var-requires */
// webpack setting that is currently not used.
'use strict'

const path = require('path')
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node',
  entry: '../../language-server/src/index.ts',
  resolveLoader: {
    modules: ['../../language-server/node_modules']
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'language-server/index.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs',
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.isWebpack': JSON.stringify(true),
    })
  ],
  resolve: {
    extensions: ['.ts', '.js'],
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
