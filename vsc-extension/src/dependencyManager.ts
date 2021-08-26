import { Uri } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import { XMLDocumentDependencyRequest, XMLDocumentDependencyResponse } from './events'

export interface DependencyMetadata {
  dependencies: Map<string, ModDependency>
}

export interface ModDependency {
  defs: Uri[]
  modId: string
}

export class DependencyManager {
  constructor(private metadata: DependencyMetadata) {}

  listen(client: LanguageClient) {
    client.onRequest(XMLDocumentDependencyRequest, this.onXMLDocumentDependencyRequest.bind(this))
  }

  private async onXMLDocumentDependencyRequest({
    version,
  }: XMLDocumentDependencyRequest): Promise<XMLDocumentDependencyResponse> {
    const response: XMLDocumentDependencyResponse = {
      items: [],
    }

    return response
  }

  // private async loadDependencies()
}
