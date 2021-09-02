import DomHandler from './domhandler'
import { Parser } from './htmlparser2'

export * from './domhandler'
export * from './htmlparser2'
export * from './range'

export function parse(text: string, uri = '') {
  const domHandler = new DomHandler()
  const parser = new Parser(domHandler)

  parser.end(text)

  domHandler.root.uri = uri

  return domHandler.root
}
