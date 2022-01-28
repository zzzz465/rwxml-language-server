/* eslint-disable @typescript-eslint/no-var-requires */
// webpack setting that is currently not used.
'use strict'

const path = require('path')
const webpack = require('webpack')

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node',
  entry: path.resolve(__dirname, '..', '..', 'language-server', 'src', 'index.ts'),
  resolveLoader: {
    modules: [path.resolve(__dirname, '..', '..', 'language-server', 'node_modules')]
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'language-server/index.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  devtool: 'source-map',
  plugins: [
    new webpack.DefinePlugin({
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
