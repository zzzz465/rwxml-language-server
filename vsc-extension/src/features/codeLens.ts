import { commands, Position, Uri } from 'vscode'

export function registerFeature() {
  // cannot call editor.action.showReferences directly because plain JSON is sended on grpc instead of object.
  return commands.registerCommand('rwxml-language-server:CodeLens:defReference', callback)
}

async function callback(uri: string | Uri, position: Position) {
  uri = Uri.parse(uri as string)
  position = new Position(position.line, position.character)
  const locations = await commands.executeCommand('vscode.executeReferenceProvider', uri, position)
  if (locations && Array.isArray(locations)) {
    commands.executeCommand('editor.action.showReferences', uri, position, locations)
  }
}
