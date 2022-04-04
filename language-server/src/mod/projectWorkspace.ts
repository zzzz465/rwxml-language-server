import { URI } from 'vscode-uri'
import { isSubFileOf, normalizePath } from '../utils'
import * as path from 'path'
import * as LINQ from 'linq-es2015'

/**
 * ProjectWorkspace manages resource paths of the specific version.
 */
export class ProjectWorkspace {
  private static readonly knownSubDirectories = ['Defs', 'Textures', 'Languages', 'Sounds']

  constructor(public readonly version: string, private readonly directories: URI[]) {}

  getResourcePath(uri: URI): string | null {
    if (!this.includes(uri)) {
      return null
    }

    const resourceDir = this.getResourceDirectoryOf(uri)
    if (!resourceDir) {
      return null
    }

    const relativePath = path.relative(resourceDir, uri.fsPath)
    const normalized = normalizePath(relativePath)

    return normalized
  }

  /**
   * @returns URI.fsPath
   */
  getResourceDirectoryOf(uri: URI): string | null {
    if (!this.includes(uri)) {
      return null
    }

    const result = LINQ.from(this.directories)
      .SelectMany((x) => this.getResourceDirectories(x))
      .FirstOrDefault((x) => isSubFileOf(x.fsPath, uri.fsPath)) as URI | undefined

    return result?.fsPath ?? null
  }

  /**
   * includes checks given uri is included in this project workspace.
   * @param uri
   */
  includes(uri: URI): boolean {
    for (const dir of this.directories) {
      if (this.isDirectoryIncludes(dir, uri)) {
        return true
      }
    }

    return false
  }

  /**
   * isDirectoryIncludes checks given uri is under given directory with knownSubDir prefixed.
   */
  private isDirectoryIncludes(directory: URI, uri: URI): boolean {
    return LINQ.from(this.getResourceDirectories(directory)).Any((x) => isSubFileOf(x.fsPath, uri.fsPath))
  }

  private getResourceDirectories(directory: URI): URI[] {
    return LINQ.from(ProjectWorkspace.knownSubDirectories)
      .Select((x) => path.join(directory.fsPath, x))
      .Select((x) => URI.file(x))
      .ToArray()
  }
}
