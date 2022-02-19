import { injectable, registry } from 'tsyringe'

/**
 * PathStore manages various paths used by program.
 * there's two implementation. win32 / darwin
 */
@registry([])
export abstract class PathStore {
  static readonly token = Symbol(PathStore.name)

  readonly type: 'win32' | 'darwin' | 'unknown' = 'unknown'

  abstract coreDirectory(): string
  abstract localModDirectory(): string
  abstract workshopModDirectory(): string
  abstract rimWorldManagedDirectory(): string
  abstract languageServerModulePath(): string
  dependencyDirectories(): string[] {
    return [this.coreDirectory(), this.localModDirectory(), this.workshopModDirectory()]
  }
}

@injectable()
export class Win32PathStore extends PathStore {
  readonly type = 'win32'

  coreDirectory(): string {
    throw new Error('Method not implemented.')
  }
  localModDirectory(): string {
    throw new Error('Method not implemented.')
  }
  workshopModDirectory(): string {
    throw new Error('Method not implemented.')
  }
  rimWorldManagedDirectory(): string {
    throw new Error('Method not implemented.')
  }
  languageServerModulePath(): string {
    throw new Error('Method not implemented.')
  }
}

@injectable()
export class DarwinPathStore extends PathStore {
  readonly type = 'darwin'

  coreDirectory(): string {
    throw new Error('Method not implemented.')
  }
  localModDirectory(): string {
    throw new Error('Method not implemented.')
  }
  workshopModDirectory(): string {
    throw new Error('Method not implemented.')
  }
  rimWorldManagedDirectory(): string {
    throw new Error('Method not implemented.')
  }
  languageServerModulePath(): string {
    throw new Error('Method not implemented.')
  }
}
