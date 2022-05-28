import * as crypto from 'crypto'
import * as fs from 'fs'

/**
 * creates md5checksum from given file
 * 1. don't pass uri. pass fsPath
 * 2. don't pass a large file because it's sync operation.
 */
export function md5sum(fsPath: string) {
  const file = fs.readFileSync(fsPath)
  const checksum = crypto.createHash('md5')
  checksum.update(file)
  return checksum.digest('hex')
}
