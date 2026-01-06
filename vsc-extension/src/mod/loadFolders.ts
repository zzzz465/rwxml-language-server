/* eslint-disable @typescript-eslint/no-namespace */
import * as cheerio from 'cheerio'
import glob from 'fast-glob'
import * as LINQ from 'linq-es2015'
import * as path from 'path'
import vscode, { Uri } from 'vscode'
import { URI } from 'vscode-uri'

export class ProjectWorkspace {
  public static readonly wellKnownResourceDirectories = ['Defs', 'Textures', 'Sounds', 'Assemblies']

  constructor(
    public readonly version: string,
    public readonly rootDirectory: URI,
    public readonly relativePaths: string[]
  ) {}

  async getResources(globPattern: string): Promise<string[]> {
    const requests = LINQ.from(this.relativePaths)
      .Select((x) => this.toAbsoluteUri(x))
      .SelectMany((x) => this.getResourceDirectories(x))
      .Select((x) =>
        glob(globPattern, {
          caseSensitiveMatch: false,
          cwd: x.fsPath,
          absolute: true,
          onlyFiles: true,
        })
      )
      .ToArray()

    return (await Promise.all(requests)).flat()
  }

  /**
   * toAbsoluteUri() returns absolute uri based on root directory path.
   */
  private toAbsoluteUri(relativePath: string): URI {
    const root = this.rootDirectory.fsPath

    return URI.file(path.resolve(root, relativePath))
  }

  /**
   * getResourceDirectories() returns
   */
  private getResourceDirectories(uri: URI): URI[] {
    return LINQ.from(ProjectWorkspace.wellKnownResourceDirectories)
      .Select((x) => path.resolve(uri.fsPath, x))
      .Select((x) => URI.file(x))
      .ToArray()
  }
}

export class LoadFolder {
  static async Load(loadFoldersFileUri: Uri): Promise<LoadFolder> {
    const loadFolder = new LoadFolder(loadFoldersFileUri)

    const raw = await vscode.workspace.fs.readFile(loadFoldersFileUri)
    const text = Buffer.from(raw).toString()

    loadFolder.load(text)

    return loadFolder
  }

  get rootDirectory(): URI {
    return URI.file(path.dirname(this.filePath.fsPath))
  }

  private readonly projectWorkspaces: Map<string, ProjectWorkspace> = new Map()

  constructor(public readonly filePath: URI) {}

  getProjectWorkspace(version: string): ProjectWorkspace {
    let workspace = this.projectWorkspaces.get(version)
    if (!workspace) {
      workspace = new ProjectWorkspace(version, this.rootDirectory, ['.', version])
    }

    return workspace
  }

  load(data: string): void {
    this.projectWorkspaces.clear()

    const $ = cheerio.load(data)
    const loadFolders = $('loadFolders')

    const workspaces = LINQ.from(loadFolders.children())
      .Where((x) => !!x.tagName.match(/v[\d]\.[\d]/))
      .Select((x) => this.parseVersionNode(x))
      .Where((x) => x !== null)
      .Cast<ProjectWorkspace>()
      .ToArray()

    for (const workspace of workspaces) {
      this.projectWorkspaces.set(workspace.version, workspace)
    }
  }

  private parseVersionNode(node: any): ProjectWorkspace {
    const $ = cheerio.load(node)

    const version = node.tagName.replace('v', '')

    const relativePaths = LINQ.from($('li'))
      .Select((x) => cheerio.load(x).text())
      .ToArray()

    return new ProjectWorkspace(version, this.rootDirectory, relativePaths)
  }
}
