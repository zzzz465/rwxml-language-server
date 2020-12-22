import path from 'path'

export const lintOnSave = false
export const configureWebpack = {
  output: {
    filename: 'main.js',
    chunkFilename: 'chunk.js'
  },
  resolve: {
    alias: {
      '@interop': path.join(__dirname, '../interop/src')
    }
  }
}
export const css = {
  extract: false
}
