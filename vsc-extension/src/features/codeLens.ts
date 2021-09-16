import { commands, Location, Position, Range, Uri } from 'vscode'

export function registerFeature() {
  // cannot call editor.action.showReferences directly because plain JSON is sended on grpc instead of object.
  return commands.registerCommand('rwxml-language-server:CodeLens:defReference', callback)
}

function callback(uri: string, position: Position, locations: (Location & { uri: string })[]) {
  commands.executeCommand(
    'editor.action.showReferences',
    Uri.parse(uri),
    new Position(position.line, position.character),
    locations.map(
      ({ range, uri }) =>
        new Location(
          Uri.parse(uri),
          new Range(
            new Position(range.start.line, range.start.character),
            new Position(range.end.line, range.end.character)
          )
        )
    )
  )
}
