import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as tsyringe from 'tsyringe'
import { singleton } from 'tsyringe'
import * as vscode from 'vscode'

@tsyringe.registry([
  {
    token: PathStore.token,
    useFactory: (c) => {
      switch (os.platform()) {
        case 'win32':
          return c.resolve(Win32PathStore)

        case 'darwin':
          return c.resolve(DarwinPathStore)

        default:
          throw new Error(`platform ${os.platform()} is not supported.  please make an issue on github.`)
      }
    },
  },
])
export abstract class PathStore {
  static readonly token = Symbol(PathStore.name)

  protected abstract defaultCacheDirectory(): string

  constructor() {
    fs.mkdirSync(this.cacheDirectory, { recursive: true })
  }

  get cacheDirectory(): string {
    return vscode.workspace.getConfiguration('rwxml.extractor.cache').get<string>('paths', this.defaultCacheDirectory())
  }
}

@singleton()
class Win32PathStore extends PathStore {
  protected defaultCacheDirectory(): string {
    const p = 'Appdata\\Roaming\\rwxml-language-server\\cache'
    return path.join(os.homedir(), p)
  }
}

@singleton()
class DarwinPathStore extends PathStore {
  protected defaultCacheDirectory(): string {
    const p = 'Library/Application Support/rwxml-language-server/cache'
    return path.join(os.homedir(), p)
  }
}
