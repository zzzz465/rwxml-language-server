/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')

module.exports = {
  lintOnSave: false,
  configureWebpack: {
    output: {
      filename: 'main.js',
      chunkFilename: 'chunk.js'
    },
    resolve: {
      alias: {
        '@interop': '../interop/src'
      }
    }
  },
  css: {
    extract: false
  }
}
