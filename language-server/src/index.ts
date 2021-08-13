import { workspace } from 'vscode'
import { createConnection, InitializeParams, InitializeResult, ProposedFeatures } from 'vscode-languageserver'

const connection = createConnection(ProposedFeatures.all)

connection.onInitialize((params: InitializeParams) => {
  const initializeResult: InitializeResult = {}

  return initializeResult
})