import { commands, Disposable, Position, Uri } from 'vscode'

const getCmd = (type: string): string => `rwxml-language-server:CodeLens:${type}`

export function registerFeature(): Disposable[] {
  // cannot call editor.action.showReferences directly because plain JSON is sended on grpc instead of object.
  return [
    commands.registerCommand('rwxml-language-server:CodeLens:defReference', callbackDefReference),
    commands.registerCommand(getCmd('nameReference'), callbackNameReference),
  ]
}

async function callbackDefReference(uriStr: string, position: Position): Promise<void> {
  const uri = Uri.parse(uriStr)
  position = new Position(position.line, position.character)

  const locations = await commands.executeCommand('vscode.executeReferenceProvider', uri, position)
  if (locations && Array.isArray(locations)) {
    commands.executeCommand('editor.action.showReferences', uri, position, locations)
  }
}

async function callbackNameReference(uriStr: string, position: Position): Promise<void> {
  const uri = Uri.parse(uriStr)
  position = new Position(position.line, position.character)

  const locations = await commands.executeCommand('vscode.executeReferenceProvider', uri, position)
  if (locations && Array.isArray(locations)) {
    commands.executeCommand('editor.action.showReferences', uri, position, locations)
  }
}
