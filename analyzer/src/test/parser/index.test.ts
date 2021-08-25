import $ from 'cheerio'
import DomHandler from '../../parser/domhandler'
import { Parser } from '../../parser/htmlparser2'

describe('parser test', () => {
  test('it should compile', () => {
    const domHandler = new DomHandler()
    const parser = new Parser(domHandler)

    parser.end()

    const root = domHandler.root

    $('', root)
  })
})
