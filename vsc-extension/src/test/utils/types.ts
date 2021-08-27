import { URI } from 'vscode-uri'

export enum FileType {
  /**
   * The file type is unknown.
   */
  Unknown = 0,
  /**
   * A regular file.
   */
  File = 1,
  /**
   * A directory.
   */
  Directory = 2,
  /**
   * A symbolic link to a file.
   */
  SymbolicLink = 64,
}

export interface FileSystem {
  /**
   * Retrieve metadata about a file.
   *
   * @param uri The uri of the file to retrieve metadata about.
   * @return The file metadata about the file.
   */
  stat(uri: URI): Thenable<any> // FileStat

  /**
   * Retrieve all entries of a {@link FileType.Directory directory}.
   *
   * @param uri The uri of the folder.
   * @return An array of name/type-tuples or a thenable that resolves to such.
   */
  readDirectory(uri: URI): Thenable<[string, FileType][]>

  /**
   * Create a new directory (Note, that new files are created via `write`-calls).
   *
   * *Note* that missing directories are created automatically, e.g this call has
   * `mkdirp` semantics.
   *
   * @param uri The uri of the new folder.
   */
  createDirectory(uri: URI): Thenable<void>

  /**
   * Read the entire contents of a file.
   *
   * @param uri The uri of the file.
   * @return An array of bytes or a thenable that resolves to such.
   */
  readFile(uri: URI): Thenable<Uint8Array>

  /**
   * Write data to a file, replacing its entire contents.
   *
   * @param uri The uri of the file.
   * @param content The new content of the file.
   */
  writeFile(uri: URI, content: Uint8Array): Thenable<void>

  /**
   * Delete a file.
   *
   * @param uri The resource that is to be deleted.
   * @param options Defines if trash can should be used and if deletion of folders is recursive
   */
  delete(uri: URI, options?: { recursive?: boolean; useTrash?: boolean }): Thenable<void>

  /**
   * Rename a file or folder.
   *
   * @param oldUri The existing file.
   * @param newUri The new location.
   * @param options Defines if existing files should be overwritten.
   */
  rename(source: URI, target: URI, options?: { overwrite?: boolean }): Thenable<void>

  /**
   * Copy files or folders.
   *
   * @param source The existing file.
   * @param destination The destination location.
   * @param options Defines if existing files should be overwritten.
   */
  copy(source: URI, target: URI, options?: { overwrite?: boolean }): Thenable<void>

  /**
   * Check if a given file system supports writing files.
   *
   * Keep in mind that just because a file system supports writing, that does
   * not mean that writes will always succeed. There may be permissions issues
   * or other errors that prevent writing a file.
   *
   * @param scheme The scheme of the filesystem, for example `file` or `git`.
   *
   * @return `true` if the file system supports writing, `false` if it does not
   * support writing (i.e. it is readonly), and `undefined` if the editor does not
   * know about the filesystem.
   */
  isWritableFileSystem(scheme: string): boolean | undefined
}
