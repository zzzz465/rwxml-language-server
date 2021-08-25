import DomHandler from '../../parser/domhandler'
import { Parser } from '../../parser/htmlparser2'
import $ from 'cheerio'

describe('XML Parsing test', () => {
  test('it should parse xml with ranges', () => {
    const exampleXML = `\
<?xml version="1.0" encoding="utf-8" ?>
<ModMetaData>
	<name>Paniel the Automata Beta 1.3</name>
	<author>AhnDemi</author>
	<packageId>AhnDemi.PanieltheAutomataBetatwo</packageId>
	<supportedVersions>
		<li>1.3</li>
	</supportedVersions>
	<description>
Paniel the Automata
	</description>
</ModMetaData>\
`
    const domHandler = new DomHandler()
    const parser = new Parser(domHandler)

    parser.end(exampleXML)

    const root = domHandler.root

    $._options.xmlMode = true

    const name = $(root).find('ModMetaData > name').text()
    expect(name).toEqual('Paniel the Automata Beta 1.3')

    const author = $(root).find('ModMetaData > author').text()
    expect(author).toEqual('AhnDemi')

    const packageId = $(root).find('ModMetaData > packageId').text()
    expect(packageId).toEqual('AhnDemi.PanieltheAutomataBetatwo')

    const description = $(root).find('ModMetaData > description').text()
    expect(description.trim()).toEqual('Paniel the Automata')

    const supportedVersions = $(root)
      .find('ModMetaData > supportedVersions > li')
      .map((_, el) => $(el).text())
      .toArray()
    expect(supportedVersions).toEqual(['1.3'])
  })
})
