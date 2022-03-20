import * as ls from 'vscode-languageserver'

export interface Provider {
  listen(connection: ls.Connection): void
}
