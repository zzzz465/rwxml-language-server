//@ts-check
// webpack setting that is currently not used.
'use strict'

const path = require('path')
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')
const { from } = require('linq-es2015')

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/

  entry: {
    'client': './src/client/extension.ts',
    'server': './src/server/server.ts'
  },
  // entry: './src/client/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]/index.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.isWebpack': JSON.stringify(true)
    }),
    // @ts-ignore
    new CopyPlugin({
      patterns: [
        { from: 'out/client/extractor', to: 'client/extractor' },
        { from: 'config-gui/dist', to: 'config-gui' }
      ]
    })
  ],
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js'],
    alias: {
      '@interop': path.resolve(__dirname, 'interop/src')
    }
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
              projectReferences: true
            }
          }
        ]
      }
    ]
  }
}

module.exports = config