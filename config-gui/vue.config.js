module.exports = {
  lintOnSave: false,
  configureWebpack: {
    output: {
      filename: 'main.js',
      chunkFilename: 'chunk.js'
    }
  },
  css: {
    extract: false
  }
}
