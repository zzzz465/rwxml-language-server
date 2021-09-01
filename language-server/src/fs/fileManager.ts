import EventEmitter from 'events'
import { LoadFolder } from 'src/mod/loadfolders'
import { URI } from 'vscode-uri'
import { TextureFile } from './file'

interface ListeningEvents {
  fileAdded(file: File): void
  fileChanged(file: File): void
  fileDeleted(file: File): void
}

export class FileManager {
  textures: Set<string> = new Set()
  audios: Set<string> = new Set()

  constructor(private readonly loadFolder: LoadFolder) {}

  isUnderResourceDirectory(uri: URI) {
    // TODO:
    // this.loadFolder.
  }

  listen(event: EventEmitter<ListeningEvents>) {
    event.on('fileAdded', this.onFileAdded.bind(this))
    event.on('fileChanged', this.onFileChanged.bind(this))
    event.on('fileDeleted', this.onFileDeleted.bind(this))
  }

  private onFileAdded(file: File) {
    if (file instanceof TextureFile) {
      this.textures.add(file.uri.toString())
    }
  }

  private onFileChanged(file: File) {}

  private onFileDeleted(file: File) {}
}
