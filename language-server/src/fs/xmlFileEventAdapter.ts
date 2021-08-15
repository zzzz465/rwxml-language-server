import { TextDocuments } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { File, XMLFile } from './file'
import { FileEventManager } from './fileEventManager'

export class XMLFileEventAdapter {
  constructor(
    private readonly fileEventManager: FileEventManager,
    private readonly textDocuments: TextDocuments<TextDocument>
  ) {}

  onFileAdded(file: File) {
    if (file instanceof XMLFile) {
      this.fileEventManager.FileCreated(file)
    }
  }

  onFileChanged(file: File, source: 'textDocuments' | 'fs') {
    if (file instanceof XMLFile) {
      if (!(source === 'fs' && this.textDocuments.get(file.uri.toString()))) {
        this.fileEventManager.FileChanged(file)
      }
    }
  }

  onFileDeleted(file: File) {
    if (file instanceof XMLFile) {
      this.fileEventManager.FileDeleted(file)
    }
  }
}
