import { DomHandler } from './domhandler'
import { Parser } from './htmlparser2'
import { Document } from './node'

export * from './domhandler'
export * from './htmlparser2'
export * from './node'
export * from './range'

export function parse(text: string, uri = ''): Document {
  const domHandler = new DomHandler()
  const parser = new Parser(domHandler)

  parser.end(text)

  domHandler.root.uri = uri

  return domHandler.root
}
