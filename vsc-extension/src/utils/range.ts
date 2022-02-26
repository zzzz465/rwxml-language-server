import vscode from 'vscode'
import * as ls from 'vscode-languageclient'

export function rangeJSONToRange(range: ls.Range): vscode.Range {
  return new vscode.Range(
    new vscode.Position(range.start.line, range.start.character),
    new vscode.Position(range.end.line, range.end.character)
  )
}
