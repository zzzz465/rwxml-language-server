// manages all file in project

import { createNanoEvents, DefaultEvents, Emitter } from 'nanoevents'
import { Disposable } from 'vscode-languageserver'
import { File } from './file'

export interface FileManagerEvents {
  created(file: File): void
  changed(file: File): void
  deleted(file: File): void
  dispose(): void
}

export class FileManager implements Disposable {
  readonly fileEvent: Emitter<FileManagerEvents> = createNanoEvents()

  FileCreated(file: File) {
    this.fileEvent.emit('created', file)
  }

  FileChanged(file: File) {
    this.fileEvent.emit('changed', file)
  }

  FileDeleted(file: File) {
    this.fileEvent.emit('deleted', file)
  }

  dispose() {
    this.fileEvent.emit('dispose')
  }
}
