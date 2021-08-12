import { promises } from 'fs'

export async function isDirectory(path: string) {
  return (await promises.lstat(path)).isDirectory()
}
