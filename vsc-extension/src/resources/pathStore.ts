import * as tsyringe from 'tsyringe'
import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import { singleton } from 'tsyringe'

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
          throw new Error(`platform ${os.platform()} is not supported.`)
      }
    },
  },
])
export abstract class PathStore {
  static readonly token = Symbol(PathStore.name)

  protected abstract defaultCacheDirectory(): string

  get cacheDirectory(): string {
    return vscode.workspace.getConfiguration('rwxml.extractor.cache').get<string>('paths', this.defaultCacheDirectory())
  }
}

@singleton()
class Win32PathStore extends PathStore {
  protected defaultCacheDirectory(): string {
    const p = 'Library\\Application Support\\rwxml-language-server\\cache'
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
