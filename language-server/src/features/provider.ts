import * as ls from 'vscode-languageserver'

export interface Provider {
  init(connection: ls.Connection): void
}
