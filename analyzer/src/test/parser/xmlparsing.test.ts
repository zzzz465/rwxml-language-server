import DomHandler, { Document, Element, NodeWithChildren } from '../../parser/domhandler'
import { Parser } from '../../parser/htmlparser2'
import $ from 'cheerio'

$._options.xmlMode = true

function parse(text: string): Document {
  const domHandler = new DomHandler()
  const parser = new Parser(domHandler)
  parser.end(text)

  return domHandler.root
}

describe('XML Parsing test', () => {
  const exampleXML = `\
<?xml version="1.0" encoding="utf-8" ?>
<ModMetaData SomeAttribute="foobar" attribWithSingleQuote='singlequote'>
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
  test('it should parse xml with ranges', () => {
    const domHandler = new DomHandler()
    const parser = new Parser(domHandler)

    parser.end(exampleXML)

    const root = domHandler.root

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

  test('xml parser range test', () => {
    const root = parse(exampleXML)

    const ModMetaData = $(root).find('ModMetaData').get(0) as unknown as Element // 40 ~ 354
    expect(ModMetaData.nodeRange.start).toEqual(40)
    expect(ModMetaData.nodeRange.end).toEqual(355)

    expect(ModMetaData.openTagRange.start).toEqual(40)
    expect(ModMetaData.openTagRange.end).toEqual(112)
    expect(ModMetaData.openTagRange.length()).toEqual(72)

    expect(ModMetaData.openTagNameRange.start).toEqual(41)
    expect(ModMetaData.openTagNameRange.end).toEqual(52)
    expect(ModMetaData.openTagNameRange.length()).toEqual(11)

    const someAttrib = ModMetaData.attribs['SomeAttribute']
    expect(someAttrib).not.toBeNull()
    expect(someAttrib.name).toBe('SomeAttribute')
    expect(someAttrib.value).toBe('foobar')
    expect(someAttrib.nameRange.start).toBe(53)
    expect(someAttrib.nameRange.end).toBe(66)
    expect(someAttrib.valueRange.start).toBe(68)
    expect(someAttrib.valueRange.end).toBe(74)
  })

  test('xml parser text node range test', () => {
    const root = parse(exampleXML)

    const packageIdNode = $(root).find('packageId').get(0) as unknown as Element

    expect($(packageIdNode).text()).toEqual('AhnDemi.PanieltheAutomataBetatwo')
    expect(packageIdNode.nodeRange.length()).toEqual(55)
  })

  test('it should return Element instance', () => {
    const domHandler = new DomHandler()
    const parser = new Parser(domHandler)

    parser.end(exampleXML)

    const root = domHandler.root

    const elements = $('*', root)

    const nodes = elements.toArray()

    for (const node of nodes) {
      expect(node instanceof Element).toBeTruthy()
    }
  })
})

describe('broken XML parsing test', () => {
  const attribBrokenXML = `\
<?xml version="1.0" encoding="utf-8" ?>
<ModMetaData validAttrib invalidEqual= invalidEqual="asd>
<name>Paniel the Automata Beta 1.3</name>
</ModMetaData>\
`

  const notclosedXML = `\
<?xml version="1.0" encoding="utf-8" ?>
<ModMetaData>
  <name>Paniel the Automata Beta 1.3</
  <author>AhnDemi</author>
  <packageId>AhnDemi.PanieltheAutomataBetatwo</packageId>
</ModMetaData>\
`

  test('invalid xml should be parsed', () => {
    const root = parse(attribBrokenXML)

    const nameNode = $(root).find('ModMetaData > name')
    expect(nameNode.text()).toEqual('Paniel the Automata Beta 1.3')
  })

  test('unclosed xml should be parsed', () => {
    const root = parse(notclosedXML)

    const nameNode = $(root).find('ModMetaData > name')
    expect(nameNode.text()).toBe('Paniel the Automata Beta 1.3')
  })
})
